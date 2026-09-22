import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  FinancialLiteracyLevel,
  Prisma,
  SurveyType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import {
  FINANCIAL_LITERACY_CONSENT_TEXT,
  FINANCIAL_LITERACY_CONSENT_VERSION,
  FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
  FINANCIAL_LITERACY_TOTAL_QUESTIONS,
  getPublicFinancialLiteracyQuestions,
  isValidOptionForQuestion,
  isValidQuestionId,
  PublicFinancialLiteracyQuestion,
  scoreFinancialLiteracyAnswers,
} from '../domain/financial-literacy-questions';
import { StartFinancialLiteracyDto } from '../interface/dto/start-financial-literacy.dto';
import { SaveFinancialLiteracyProgressDto } from '../interface/dto/save-financial-literacy-progress.dto';
import { SubmitFinancialLiteracyDto } from '../interface/dto/submit-financial-literacy.dto';

export interface AssessmentStatusResponse {
  assessmentType: AssessmentType;
  questionnaireVersion: string;
  status: AssessmentStatus | 'NOT_STARTED';
  consentGiven: boolean;
  consentVersion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  answeredQuestions: Record<string, string>;
  totalAnswered: number;
  totalQuestions: number;
  consentText: string;
}

export interface AssessmentSubmissionResponse {
  completed: boolean;
  message: string;
  assessmentType: AssessmentType;
  questionnaireVersion: string;
  completedAt: string;
}

export interface ResearchExportRow {
  researchParticipantId: string;
  assessmentType: string;
  questionnaireVersion: string;
  questionId: string;
  domain: string;
  selectedOption: string;
  isCorrect: boolean;
  score: number;
  totalScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

@Injectable()
export class FinancialLiteracyAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Resolves or creates a pseudonymous participant record for the authenticated user.
   * Generates a cryptographically random UUID v4 on the server.
   * Never derives researchParticipantId from email, name, DNI or other personal data.
   */
  async getOrCreateParticipant(userId: string): Promise<{
    id: string;
    userId: string;
    researchParticipantId: string;
  }> {
    const existing = await this.prisma.researchParticipant.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    const randomId = randomUUID();
    return this.prisma.researchParticipant.create({
      data: {
        userId,
        researchParticipantId: randomId,
      },
    });
  }

  /**
   * Returns question bank definition without correct answers or scoring keys.
   */
  getQuestions(assessmentType: AssessmentType = AssessmentType.PRE): {
    questionnaireVersion: string;
    assessmentType: AssessmentType;
    totalQuestions: number;
    consentText: string;
    consentVersion: string;
    questions: PublicFinancialLiteracyQuestion[];
  } {
    return {
      questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
      assessmentType,
      totalQuestions: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
      consentText: FINANCIAL_LITERACY_CONSENT_TEXT,
      consentVersion: FINANCIAL_LITERACY_CONSENT_VERSION,
      questions: getPublicFinancialLiteracyQuestions(),
    };
  }

  /**
   * Returns completion / resumption status for the authenticated user.
   */
  async getStatus(
    userId: string,
    assessmentType: AssessmentType = AssessmentType.PRE,
  ): Promise<AssessmentStatusResponse> {
    const participant = await this.prisma.researchParticipant.findUnique({
      where: { userId },
    });

    if (!participant) {
      return {
        assessmentType,
        questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        status: 'NOT_STARTED',
        consentGiven: false,
        consentVersion: null,
        startedAt: null,
        completedAt: null,
        answeredQuestions: {},
        totalAnswered: 0,
        totalQuestions: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
        consentText: FINANCIAL_LITERACY_CONSENT_TEXT,
      };
    }

    const assessment = await this.prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
      include: {
        answers: true,
      },
    });

    if (!assessment) {
      return {
        assessmentType,
        questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        status: 'NOT_STARTED',
        consentGiven: false,
        consentVersion: null,
        startedAt: null,
        completedAt: null,
        answeredQuestions: {},
        totalAnswered: 0,
        totalQuestions: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
        consentText: FINANCIAL_LITERACY_CONSENT_TEXT,
      };
    }

    const answerMap: Record<string, string> = {};
    if (assessment.status === AssessmentStatus.IN_PROGRESS) {
      for (const ans of assessment.answers) {
        answerMap[ans.questionId] = ans.selectedOption;
      }
    }

    return {
      assessmentType,
      questionnaireVersion: assessment.questionnaireVersion,
      status: assessment.status,
      consentGiven: assessment.consentGiven,
      consentVersion: assessment.consentVersion,
      startedAt: assessment.startedAt.toISOString(),
      completedAt: assessment.completedAt?.toISOString() ?? null,
      answeredQuestions: answerMap,
      totalAnswered:
        assessment.status === AssessmentStatus.COMPLETED
          ? FINANCIAL_LITERACY_TOTAL_QUESTIONS
          : Object.keys(answerMap).length,
      totalQuestions: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
      consentText: FINANCIAL_LITERACY_CONSENT_TEXT,
    };
  }

  /**
   * Starts an assessment with informed academic consent.
   */
  async startAssessment(
    userId: string,
    dto: StartFinancialLiteracyDto,
    assessmentType: AssessmentType = AssessmentType.PRE,
  ): Promise<AssessmentStatusResponse> {
    if (!dto.consentGiven) {
      throw new BadRequestException(
        'Debes aceptar el consentimiento académico para participar en la evaluación.',
      );
    }

    const participant = await this.getOrCreateParticipant(userId);

    const existing = await this.prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
      include: { answers: true },
    });

    if (existing) {
      if (existing.status === AssessmentStatus.COMPLETED) {
        throw new ConflictException(
          'ASSESSMENT_ALREADY_COMPLETED: La evaluación ya ha sido completada y no puede reiniciarse.',
        );
      }

      const answerMap: Record<string, string> = {};
      for (const ans of existing.answers) {
        answerMap[ans.questionId] = ans.selectedOption;
      }

      return {
        assessmentType,
        questionnaireVersion: existing.questionnaireVersion,
        status: existing.status,
        consentGiven: existing.consentGiven,
        consentVersion: existing.consentVersion,
        startedAt: existing.startedAt.toISOString(),
        completedAt: null,
        answeredQuestions: answerMap,
        totalAnswered: Object.keys(answerMap).length,
        totalQuestions: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
        consentText: FINANCIAL_LITERACY_CONSENT_TEXT,
      };
    }

    const now = new Date();
    const created = await this.prisma.financialLiteracyAssessment.create({
      data: {
        researchParticipantId: participant.researchParticipantId,
        assessmentType,
        questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        status: AssessmentStatus.IN_PROGRESS,
        maxScore: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
        consentGiven: true,
        consentVersion: dto.consentVersion || FINANCIAL_LITERACY_CONSENT_VERSION,
        consentAt: now,
        startedAt: now,
      },
    });

    this.auditLog.record({
      action: 'START_FINANCIAL_LITERACY_ASSESSMENT',
      resource: 'FinancialLiteracyAssessment',
      resourceId: created.id,
      afterJson: {
        assessmentType,
        questionnaireVersion: created.questionnaireVersion,
        status: created.status,
        consentVersion: created.consentVersion,
      },
    });

    return {
      assessmentType,
      questionnaireVersion: created.questionnaireVersion,
      status: created.status,
      consentGiven: created.consentGiven,
      consentVersion: created.consentVersion,
      startedAt: created.startedAt.toISOString(),
      completedAt: null,
      answeredQuestions: {},
      totalAnswered: 0,
      totalQuestions: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
      consentText: FINANCIAL_LITERACY_CONSENT_TEXT,
    };
  }

  /**
   * Saves partial progress while assessment is IN_PROGRESS.
   * If app is closed, user can resume.
   */
  async saveProgress(
    userId: string,
    dto: SaveFinancialLiteracyProgressDto,
    assessmentType: AssessmentType = AssessmentType.PRE,
  ): Promise<{ savedCount: number; status: AssessmentStatus }> {
    const participant = await this.getOrCreateParticipant(userId);

    let assessment = await this.prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
    });

    if (!assessment) {
      // Auto-initialize if not yet started
      const now = new Date();
      assessment = await this.prisma.financialLiteracyAssessment.create({
        data: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
          status: AssessmentStatus.IN_PROGRESS,
          maxScore: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
          consentGiven: true,
          consentVersion: FINANCIAL_LITERACY_CONSENT_VERSION,
          consentAt: now,
          startedAt: now,
        },
      });
    }

    if (assessment.status === AssessmentStatus.COMPLETED) {
      throw new ConflictException(
        'ASSESSMENT_ALREADY_COMPLETED: La evaluación ya ha sido completada y no puede modificarse.',
      );
    }

    const answers = dto.answers ?? {};
    let savedCount = 0;

    for (const [questionId, selectedOption] of Object.entries(answers)) {
      if (!isValidQuestionId(questionId)) {
        throw new BadRequestException(`Pregunta inexistente: ${questionId}`);
      }
      if (!isValidOptionForQuestion(questionId, selectedOption)) {
        throw new BadRequestException(
          `Opción inválida '${selectedOption}' para la pregunta ${questionId}`,
        );
      }

      await this.prisma.financialLiteracyAnswer.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: assessment.id,
            questionId,
          },
        },
        create: {
          assessmentId: assessment.id,
          questionId,
          domain: this.resolveDomain(questionId),
          selectedOption,
          isCorrect: false, // Calculated upon final submit
          score: 0,
        },
        update: {
          selectedOption,
          answeredAt: new Date(),
        },
      });
      savedCount++;
    }

    return { savedCount, status: assessment.status };
  }

  /**
   * Final atomic submission:
   * 1. Verifies exactly 12 answers.
   * 2. Verifies all questionIds belong to FINLIT_PRE_V1.
   * 3. Verifies each question appears only once.
   * 4. Calculates score on the server (0–12).
   * 5. Saves answers, totalScore, COMPLETED status inside transaction.
   * 6. Updates user's financialLiteracyLevel.
   * 7. Dual-writes to legacy SurveyResponse for compatibility.
   */
  async submitAssessment(
    userId: string,
    dto: SubmitFinancialLiteracyDto,
    assessmentType: AssessmentType = AssessmentType.PRE,
  ): Promise<AssessmentSubmissionResponse> {
    const answers = dto.answers ?? {};
    const answerKeys = Object.keys(answers);

    if (answerKeys.length !== FINANCIAL_LITERACY_TOTAL_QUESTIONS) {
      throw new BadRequestException(
        `Debes responder exactamente las ${FINANCIAL_LITERACY_TOTAL_QUESTIONS} preguntas antes de finalizar. Respuestas recibidas: ${answerKeys.length}.`,
      );
    }

    for (const key of answerKeys) {
      if (!isValidQuestionId(key)) {
        throw new BadRequestException(`La pregunta '${key}' no pertenece a ${FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION}.`);
      }
      const val = answers[key];
      if (!isValidOptionForQuestion(key, val)) {
        throw new BadRequestException(`Opción inválida '${val}' para la pregunta '${key}'.`);
      }
    }

    const participant = await this.getOrCreateParticipant(userId);

    const existing = await this.prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
    });

    if (existing && existing.status === AssessmentStatus.COMPLETED) {
      throw new ConflictException(
        'ASSESSMENT_ALREADY_COMPLETED: La evaluación ya ha sido enviada definitivamente y no puede repetirse ni sobrescribirse.',
      );
    }

    // Score answers strictly on server
    const scoringResult = scoreFinancialLiteracyAnswers(answers);
    const now = new Date();

    // Execute atomic transaction
    await this.prisma.$transaction(async (tx) => {
      let assessment = existing;
      if (!assessment) {
        assessment = await tx.financialLiteracyAssessment.create({
          data: {
            researchParticipantId: participant.researchParticipantId,
            assessmentType,
            questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
            status: AssessmentStatus.COMPLETED,
            totalScore: scoringResult.totalScore,
            maxScore: scoringResult.maxScore,
            consentGiven: true,
            consentVersion: dto.consentVersion || FINANCIAL_LITERACY_CONSENT_VERSION,
            consentAt: now,
            startedAt: now,
            completedAt: now,
          },
        });
      } else {
        assessment = await tx.financialLiteracyAssessment.update({
          where: { id: assessment.id },
          data: {
            status: AssessmentStatus.COMPLETED,
            totalScore: scoringResult.totalScore,
            maxScore: scoringResult.maxScore,
            completedAt: now,
            consentGiven: true,
            consentVersion: dto.consentVersion || assessment.consentVersion || FINANCIAL_LITERACY_CONSENT_VERSION,
            consentAt: assessment.consentAt ?? now,
          },
        });
      }

      // Upsert each of the 12 answers with server-determined correctness and score
      for (const scored of scoringResult.scoredAnswers) {
        await tx.financialLiteracyAnswer.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: assessment.id,
              questionId: scored.questionId,
            },
          },
          create: {
            assessmentId: assessment.id,
            questionId: scored.questionId,
            domain: scored.domain,
            selectedOption: scored.selectedOption,
            isCorrect: scored.isCorrect,
            score: scored.score,
            answeredAt: now,
          },
          update: {
            domain: scored.domain,
            selectedOption: scored.selectedOption,
            isCorrect: scored.isCorrect,
            score: scored.score,
            answeredAt: now,
          },
        });
      }

      // Update user financialLiteracyLevel and profileCompleted
      const level: FinancialLiteracyLevel =
        scoringResult.totalScore >= 9
          ? FinancialLiteracyLevel.HIGH
          : scoringResult.totalScore >= 5
            ? FinancialLiteracyLevel.MEDIUM
            : FinancialLiteracyLevel.LOW;

      await tx.user.update({
        where: { id: userId },
        data: {
          financialLiteracyLevel: level,
        },
      });

      // Maintain legacy Survey & SurveyResponse for backwards compatibility
      const surveyType = assessmentType === AssessmentType.PRE ? SurveyType.PRE : SurveyType.POST;
      let legacySurvey = await tx.survey.findFirst({ where: { type: surveyType } });
      if (!legacySurvey) {
        legacySurvey = await tx.survey.create({
          data: {
            type: surveyType,
            questionsJson: [] as unknown as Prisma.InputJsonValue,
          },
        });
      }

      const legacyScorePct = Math.round(
        (scoringResult.totalScore / scoringResult.maxScore) * 100,
      );

      await tx.surveyResponse.upsert({
        where: {
          userId_surveyId: {
            userId,
            surveyId: legacySurvey.id,
          },
        },
        create: {
          userId,
          surveyId: legacySurvey.id,
          answersJson: answers,
          score: new Decimal(legacyScorePct),
          completedAt: now,
        },
        update: {
          answersJson: answers,
          score: new Decimal(legacyScorePct),
          completedAt: now,
        },
      });
    });

    this.auditLog.record({
      action: `SUBMIT_FINANCIAL_LITERACY_${assessmentType}`,
      resource: 'FinancialLiteracyAssessment',
      resourceId: participant.researchParticipantId,
      afterJson: {
        assessmentType,
        questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        status: AssessmentStatus.COMPLETED,
        totalScore: scoringResult.totalScore,
        maxScore: scoringResult.maxScore,
      },
    });

    this.analytics.track(userId, 'financial_literacy_pre_submitted', {
      assessmentType,
      questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
    });

    return {
      completed: true,
      message: 'Evaluación inicial completada. Gracias por participar.',
      assessmentType,
      questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
      completedAt: now.toISOString(),
    };
  }

  /**
   * Pseudonymized dataset export for academic research (thesis).
   * NEVER joins with User table.
   * EXCLUDES email, name, phone, DNI, password, IP, deviceId, tokens.
   */
  async exportPseudonymizedResearchDataset(): Promise<ResearchExportRow[]> {
    const assessments = await this.prisma.financialLiteracyAssessment.findMany({
      select: {
        id: true,
        researchParticipantId: true,
        assessmentType: true,
        questionnaireVersion: true,
        totalScore: true,
        startedAt: true,
        completedAt: true,
        answers: {
          select: {
            questionId: true,
            domain: true,
            selectedOption: true,
            isCorrect: true,
            score: true,
          },
        },
      },
      orderBy: [{ researchParticipantId: 'asc' }, { assessmentType: 'asc' }],
    });

    const rows: ResearchExportRow[] = [];
    for (const a of assessments) {
      for (const ans of a.answers) {
        rows.push({
          researchParticipantId: a.researchParticipantId,
          assessmentType: a.assessmentType,
          questionnaireVersion: a.questionnaireVersion,
          questionId: ans.questionId,
          domain: ans.domain,
          selectedOption: ans.selectedOption,
          isCorrect: ans.isCorrect,
          score: ans.score,
          totalScore: a.totalScore,
          startedAt: a.startedAt.toISOString(),
          completedAt: a.completedAt?.toISOString() ?? null,
        });
      }
    }

    return rows;
  }

  private resolveDomain(questionId: string): string {
    const questions = getPublicFinancialLiteracyQuestions();
    const q = questions.find((item) => item.questionId === questionId);
    return q?.domain ?? 'GENERAL';
  }
}
