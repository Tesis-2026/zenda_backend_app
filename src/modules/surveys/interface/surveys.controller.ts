import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAuthErrors,
  ApiConflictError,
  ApiNotFoundError,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import {
  FinancialLiteracyLevel,
  Prisma,
  Survey,
  SurveyType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import {
  parseSurveyQuestions,
  SurveyQuestionJson,
} from '../domain/survey-question.types';
import { defaultQuestionsForSurveyType } from '../domain/default-surveys';
import { FinancialLiteracyAssessmentService } from '../application/financial-literacy-assessment.service';
import { FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION } from '../domain/financial-literacy-questions';
import { StartFinancialLiteracyDto } from './dto/start-financial-literacy.dto';
import { SaveFinancialLiteracyProgressDto } from './dto/save-financial-literacy-progress.dto';
import { SubmitFinancialLiteracyDto } from './dto/submit-financial-literacy.dto';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import { AssessmentStatus, AssessmentType } from '@prisma/client';
import { Put } from '@nestjs/common';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly auditLog: AuditLogService,
    private readonly finLitService: FinancialLiteracyAssessmentService,
  ) {}

  @Get('pre')
  @ApiOperation({ summary: 'Get pre-usage survey questions (US-1201 / FINLIT_PRE_V1)' })
  @ApiResponse({
    status: 200,
    description: 'Pre-survey definition with embedded questions (without correctAnswer)',
  })
  @ApiAuthErrors()
  async getPreSurvey(): Promise<object> {
    const qData = this.finLitService.getQuestions(AssessmentType.PRE);
    return {
      id: 'finlit-pre-v1',
      type: 'PRE',
      assessmentType: 'PRE',
      questionnaireVersion: qData.questionnaireVersion,
      totalQuestions: qData.totalQuestions,
      consentText: qData.consentText,
      consentVersion: qData.consentVersion,
      questions: qData.questions.map((q) => ({
        id: q.questionId,
        questionId: q.questionId,
        order: q.order,
        domain: q.domain,
        text: q.questionText,
        questionText: q.questionText,
        options: q.options,
      })),
    };
  }

  @Get('pre/status')
  @ApiOperation({ summary: 'Get pre-test status and saved progress (US-1201)' })
  @ApiResponse({
    status: 200,
    description: 'Current assessment state (NOT_STARTED, IN_PROGRESS, COMPLETED) and saved answers',
  })
  @ApiAuthErrors()
  async getPreStatus(@UserId() userId: string): Promise<object> {
    return this.finLitService.getStatus(userId, AssessmentType.PRE);
  }

  @Post('pre/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or resume pre-test with academic informed consent' })
  @ApiResponse({
    status: 200,
    description: 'Assessment initiated in IN_PROGRESS state',
  })
  @ApiAuthErrors()
  async startPre(
    @UserId() userId: string,
    @Body() dto: StartFinancialLiteracyDto,
  ): Promise<object> {
    return this.finLitService.startAssessment(userId, dto, AssessmentType.PRE);
  }

  @Put('pre/save-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save partial progress for pre-test in progress' })
  @ApiResponse({
    status: 200,
    description: 'Answers saved to allow resume',
  })
  @ApiAuthErrors()
  async savePreProgress(
    @UserId() userId: string,
    @Body() dto: SaveFinancialLiteracyProgressDto,
  ): Promise<object> {
    return this.finLitService.saveProgress(userId, dto, AssessmentType.PRE);
  }

  @Post('pre/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit pre-usage survey response (US-1201 / FINLIT_PRE_V1)' })
  @ApiResponse({
    status: 201,
    description: 'Response recorded atomically; user financialLiteracyLevel updated',
  })
  @ApiValidationError()
  @ApiConflictError('Pre-survey already submitted by this user')
  @ApiAuthErrors()
  async submitPre(
    @UserId() userId: string,
    @Body() dto: SubmitFinancialLiteracyDto,
  ): Promise<object> {
    const submission = await this.finLitService.submitAssessment(
      userId,
      dto,
      AssessmentType.PRE,
    );
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { financialLiteracyLevel: true },
    });
    return {
      completed: true,
      message: submission.message,
      assessmentType: submission.assessmentType,
      questionnaireVersion: submission.questionnaireVersion,
      completedAt: submission.completedAt,
      level: user.financialLiteracyLevel ?? 'LOW',
    };
  }

  @Get('post')
  @ApiOperation({ summary: 'Get post-usage survey questions (US-1202 / FINLIT_PRE_V1)' })
  @ApiResponse({
    status: 200,
    description: 'Post-survey definition with embedded questions (without correctAnswer)',
  })
  @ApiAuthErrors()
  async getPostSurvey(): Promise<object> {
    const qData = this.finLitService.getQuestions(AssessmentType.POST);
    return {
      id: 'finlit-post-v1',
      type: 'POST',
      assessmentType: 'POST',
      questionnaireVersion: qData.questionnaireVersion,
      totalQuestions: qData.totalQuestions,
      consentText: qData.consentText,
      consentVersion: qData.consentVersion,
      questions: qData.questions.map((q) => ({
        id: q.questionId,
        questionId: q.questionId,
        order: q.order,
        domain: q.domain,
        text: q.questionText,
        questionText: q.questionText,
        options: q.options,
      })),
    };
  }

  @Get('post/status')
  @ApiOperation({ summary: 'Get post-test status and saved progress (US-1202)' })
  @ApiResponse({
    status: 200,
    description: 'Current assessment state (NOT_STARTED, IN_PROGRESS, COMPLETED) and saved answers',
  })
  @ApiAuthErrors()
  async getPostStatus(@UserId() userId: string): Promise<object> {
    return this.finLitService.getStatus(userId, AssessmentType.POST);
  }

  @Post('post/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or resume post-test with academic informed consent' })
  @ApiResponse({
    status: 200,
    description: 'Assessment initiated in IN_PROGRESS state',
  })
  @ApiAuthErrors()
  async startPost(
    @UserId() userId: string,
    @Body() dto: StartFinancialLiteracyDto,
  ): Promise<object> {
    return this.finLitService.startAssessment(userId, dto, AssessmentType.POST);
  }

  @Put('post/save-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save partial progress for post-test in progress' })
  @ApiResponse({
    status: 200,
    description: 'Answers saved to allow resume',
  })
  @ApiAuthErrors()
  async savePostProgress(
    @UserId() userId: string,
    @Body() dto: SaveFinancialLiteracyProgressDto,
  ): Promise<object> {
    return this.finLitService.saveProgress(userId, dto, AssessmentType.POST);
  }

  @Post('post/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit post-usage survey response (US-1202)' })
  @ApiResponse({
    status: 201,
    description: 'Response recorded; returns score + improvement vs pre',
  })
  @ApiValidationError()
  @ApiConflictError('Post-survey already submitted by this user')
  @ApiAuthErrors()
  async submitPost(
    @UserId() userId: string,
    @Body() dto: SubmitFinancialLiteracyDto,
  ): Promise<{
    completed: boolean;
    message: string;
    assessmentType: string;
    questionnaireVersion: string;
    completedAt: string;
    improvement: number | null;
    score: number | null;
  }> {
    const submission = await this.finLitService.submitAssessment(
      userId,
      dto,
      AssessmentType.POST,
    );
    const participant = await this.finLitService.getOrCreateParticipant(userId);
    const [preAssessment, postAssessment] = await Promise.all([
      this.prisma.financialLiteracyAssessment.findUnique({
        where: {
          researchParticipantId_assessmentType_questionnaireVersion: {
            researchParticipantId: participant.researchParticipantId,
            assessmentType: AssessmentType.PRE,
            questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
          },
        },
      }),
      this.prisma.financialLiteracyAssessment.findUnique({
        where: {
          researchParticipantId_assessmentType_questionnaireVersion: {
            researchParticipantId: participant.researchParticipantId,
            assessmentType: AssessmentType.POST,
            questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
          },
        },
      }),
    ]);
    const improvement =
      preAssessment?.totalScore != null && postAssessment?.totalScore != null
        ? postAssessment.totalScore - preAssessment.totalScore
        : null;

    return {
      completed: true,
      message: submission.message,
      assessmentType: submission.assessmentType,
      questionnaireVersion: submission.questionnaireVersion,
      completedAt: submission.completedAt,
      improvement,
      score: postAssessment?.totalScore ?? null,
    };
  }

  @Get('sus')
  @ApiOperation({ summary: 'Get SUS usability questionnaire (US-035)' })
  @ApiResponse({
    status: 200,
    description: 'SUS questionnaire with 10 standard items',
  })
  @ApiNotFoundError('SUS survey is not seeded')
  @ApiAuthErrors()
  async getSusSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.SUS);
  }

  @Get('sus/status')
  @ApiOperation({
    summary: 'Get contextual SUS prompt eligibility for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'SUS completion status and prompt recommendation',
  })
  @ApiNotFoundError('SUS survey is not seeded')
  @ApiAuthErrors()
  async getSusStatus(@UserId() userId: string): Promise<object> {
    const survey = await this.findSurveyOrThrow(SurveyType.SUS);
    const response = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
      select: { completedAt: true, score: true },
    });

    const [
      sessionsCount,
      transactionsCount,
      chatMessagesCount,
      firstEvent,
      lastDismissal,
    ] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { userId, eventType: 'app_session_started' },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, eventType: 'record_transaction' },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, eventType: 'chat_message_sent' },
      }),
      this.prisma.analyticsEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.analyticsEvent.findFirst({
        where: { userId, eventType: 'sus_prompt_dismissed' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const now = Date.now();
    const daysSinceFirstEvent = firstEvent
      ? Math.max(
          0,
          Math.floor((now - firstEvent.createdAt.getTime()) / 86_400_000),
        )
      : 0;
    const cooldownHours = 72;
    const lastDismissedAt = lastDismissal?.createdAt ?? null;
    const dismissedRecently = lastDismissedAt
      ? now - lastDismissedAt.getTime() < cooldownHours * 3_600_000
      : false;
    const meetsUsage =
      sessionsCount >= 3 ||
      transactionsCount >= 5 ||
      chatMessagesCount >= 3 ||
      daysSinceFirstEvent >= 3;

    const completed = response !== null;
    const shouldPrompt = !completed && meetsUsage && !dismissedRecently;
    const reason = completed
      ? 'completed'
      : dismissedRecently
        ? 'dismissed_recently'
        : meetsUsage
          ? 'eligible'
          : 'not_enough_usage';

    return {
      surveyId: survey.id,
      completed,
      completedAt: response?.completedAt?.toISOString() ?? null,
      susScore: response?.score?.toNumber() ?? null,
      shouldPrompt,
      reason,
      rules: {
        minSessions: 3,
        minTransactions: 5,
        minChatMessages: 3,
        minDaysSinceFirstEvent: 3,
        cooldownHours,
      },
      metrics: {
        sessionsCount,
        transactionsCount,
        chatMessagesCount,
        daysSinceFirstEvent,
        lastDismissedAt: lastDismissedAt?.toISOString() ?? null,
      },
    };
  }

  @Post('sus/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit SUS survey response and compute SUS score (US-035)',
  })
  @ApiResponse({
    status: 201,
    description: 'SUS score (0-100) + grade (Excelente/Bueno/Regular/Bajo)',
  })
  @ApiValidationError()
  @ApiConflictError('SUS survey already submitted')
  @ApiAuthErrors()
  async submitSus(
    @UserId() userId: string,
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ susScore: number; grade: string }> {
    const survey = await this.findSurveyOrThrow(SurveyType.SUS);
    const questions = parseSurveyQuestions(survey.questionsJson);

    const existing = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
    });
    if (existing) throw new ConflictException('La encuesta SUS ya fue enviada');

    // Standard SUS scoring formula over 10 Likert items
    if (
      questions.length !== 10 ||
      questions.some((q, i) => q.order !== i + 1)
    ) {
      throw new ServiceUnavailableException('SUS requires ten ordered items');
    }
    this.assertCompleteAnswers(questions, dto.answers);
    this.assertValidLikertAnswers(questions, dto.answers);
    let contributionSum = 0;
    for (const question of questions) {
      const raw = parseInt(dto.answers[question.id] ?? '3', 10);
      const contribution = question.order % 2 !== 0 ? raw - 1 : 5 - raw;
      contributionSum += contribution;
    }
    const susScore = contributionSum * 2.5;

    await this.prisma.surveyResponse.create({
      data: {
        userId,
        surveyId: survey.id,
        answersJson: dto.answers,
        score: new Decimal(susScore),
      },
    });

    const grade =
      susScore >= 85
        ? 'Excelente'
        : susScore >= 70
          ? 'Bueno'
          : susScore >= 50
            ? 'Regular'
            : 'Bajo';

    this.auditLog.record({
      action: 'SUBMIT_SURVEY_SUS',
      resource: 'SurveyResponse',
      resourceId: userId,
      afterJson: { susScore, grade },
    });
    this.analytics.track(userId, 'sus_submitted', { susScore, grade });

    return { susScore, grade };
  }

  @Get('satisfaction')
  @ApiOperation({
    summary: 'Get final satisfaction survey for the thesis pilot',
  })
  @ApiResponse({
    status: 200,
    description: 'Likert + qualitative satisfaction questionnaire',
  })
  @ApiNotFoundError('Satisfaction survey is not seeded')
  @ApiAuthErrors()
  async getSatisfactionSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.SATISFACTION);
  }

  @Get('satisfaction/status')
  @ApiOperation({
    summary: 'Get final satisfaction survey completion status',
  })
  @ApiResponse({
    status: 200,
    description: 'Satisfaction survey completion status',
  })
  @ApiNotFoundError('Satisfaction survey is not seeded')
  @ApiAuthErrors()
  async getSatisfactionStatus(@UserId() userId: string): Promise<object> {
    const survey = await this.findSurveyOrThrow(SurveyType.SATISFACTION);
    const response = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
      select: { completedAt: true, score: true },
    });

    return {
      surveyId: survey.id,
      completed: response !== null,
      completedAt: response?.completedAt?.toISOString() ?? null,
      score: response?.score?.toNumber() ?? null,
    };
  }

  @Post('satisfaction/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit final satisfaction response and compute normalized Likert score',
  })
  @ApiResponse({
    status: 201,
    description: 'Final satisfaction score and average Likert value',
  })
  @ApiValidationError()
  @ApiConflictError('Satisfaction survey already submitted')
  @ApiAuthErrors()
  async submitSatisfaction(
    @UserId() userId: string,
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ score: number; averageLikert: number; likertCount: number }> {
    const survey = await this.findSurveyOrThrow(SurveyType.SATISFACTION);
    const questions = parseSurveyQuestions(survey.questionsJson);
    this.assertCompleteAnswers(questions, dto.answers);

    const existing = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
    });
    if (existing) {
      throw new ConflictException('La encuesta de satisfaccion ya fue enviada');
    }

    const likertQuestions = questions.filter((q) => q.options.length > 0);
    this.assertValidLikertAnswers(likertQuestions, dto.answers);
    const values = likertQuestions.map((question) => {
      const raw = parseInt(dto.answers[question.id] ?? '', 10);
      return Number.isFinite(raw) && raw >= 1 && raw <= 5 ? raw : 0;
    });
    const validValues = values.filter((v) => v > 0);
    const averageLikert =
      validValues.length > 0
        ? Number(
            (
              validValues.reduce((sum, value) => sum + value, 0) /
              validValues.length
            ).toFixed(2),
          )
        : 0;
    const score = Math.round(((averageLikert - 1) / 4) * 100);

    await this.prisma.surveyResponse.create({
      data: {
        userId,
        surveyId: survey.id,
        answersJson: dto.answers,
        score: new Decimal(Math.max(0, score)),
      },
    });

    this.auditLog.record({
      action: 'SUBMIT_SURVEY_SATISFACTION',
      resource: 'SurveyResponse',
      resourceId: userId,
      afterJson: {
        score: Math.max(0, score),
        averageLikert,
        likertCount: validValues.length,
      },
    });
    this.analytics.track(userId, 'satisfaction_submitted', {
      score: Math.max(0, score),
      averageLikert,
      likertCount: validValues.length,
      qualitativeCount: questions.filter((q) => q.options.length === 0).length,
    });

    return {
      score: Math.max(0, score),
      averageLikert,
      likertCount: validValues.length,
    };
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Get pre/post comparison for a user (US-1203)' })
  async comparison(@UserId() userId: string): Promise<object> {
    const participant = await this.prisma.researchParticipant.findUnique({
      where: { userId },
    });

    if (participant) {
      const [preAssess, postAssess] = await Promise.all([
        this.prisma.financialLiteracyAssessment.findUnique({
          where: {
            researchParticipantId_assessmentType_questionnaireVersion: {
              researchParticipantId: participant.researchParticipantId,
              assessmentType: AssessmentType.PRE,
              questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
            },
          },
        }),
        this.prisma.financialLiteracyAssessment.findUnique({
          where: {
            researchParticipantId_assessmentType_questionnaireVersion: {
              researchParticipantId: participant.researchParticipantId,
              assessmentType: AssessmentType.POST,
              questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
            },
          },
        }),
      ]);

      const preDone = preAssess?.status === AssessmentStatus.COMPLETED;
      const postDone = postAssess?.status === AssessmentStatus.COMPLETED;
      const preScore = preDone ? preAssess.totalScore : null;
      const postScore = postDone ? postAssess.totalScore : null;
      const improvementPercentage =
        preScore !== null && postScore !== null && preScore > 0
          ? Math.round(((postScore - preScore) / preScore) * 100)
          : null;

      if (preDone || postDone) {
        return {
          preScore,
          postScore,
          improvementPercentage,
          preCompleted: preDone,
          postCompleted: postDone,
        };
      }
    }

    const [preSurvey, postSurvey] = await Promise.all([
      this.prisma.survey.findFirst({ where: { type: SurveyType.PRE } }),
      this.prisma.survey.findFirst({ where: { type: SurveyType.POST } }),
    ]);

    const [preResp, postResp] = await Promise.all([
      preSurvey
        ? this.prisma.surveyResponse.findUnique({
            where: { userId_surveyId: { userId, surveyId: preSurvey.id } },
          })
        : null,
      postSurvey
        ? this.prisma.surveyResponse.findUnique({
            where: { userId_surveyId: { userId, surveyId: postSurvey.id } },
          })
        : null,
    ]);

    const preScore = preResp?.score?.toNumber() ?? null;
    const postScore = postResp?.score?.toNumber() ?? null;
    const improvementPercentage =
      preScore !== null && postScore !== null && preScore > 0
        ? Math.round(((postScore - preScore) / preScore) * 100)
        : null;

    return {
      preScore,
      postScore,
      improvementPercentage,
      preCompleted: preScore !== null,
      postCompleted: postScore !== null,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async findSurveyOrThrow(type: SurveyType): Promise<Survey> {
    const survey = await this.prisma.survey.findFirst({ where: { type } });
    const questions = defaultQuestionsForSurveyType(type);
    if (survey) {
      if (
        questions.length > 0 &&
        this.isDefaultManagedSurvey(survey.questionsJson, questions)
      ) {
        return this.prisma.survey.update({
          where: { id: survey.id },
          data: {
            questionsJson: questions as unknown as Prisma.InputJsonValue,
          },
        });
      }

      return survey;
    }

    if (questions.length === 0) {
      throw new NotFoundException(`${type} survey not configured`);
    }

    return this.prisma.survey.create({
      data: {
        type,
        questionsJson: questions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private isDefaultManagedSurvey(
    rawQuestions: Prisma.JsonValue,
    defaultQuestions: SurveyQuestionJson[],
  ): boolean {
    const questions = parseSurveyQuestions(rawQuestions);
    if (questions.length === 0) return true;

    const defaultIds = new Set(defaultQuestions.map((question) => question.id));
    return questions.every((question) => defaultIds.has(question.id));
  }

  private async getSurveyByType(type: SurveyType): Promise<object> {
    const survey = await this.findSurveyOrThrow(type);
    const questions = parseSurveyQuestions(survey.questionsJson);
    return {
      id: survey.id,
      type: survey.type,
      questions: questions.map((q) => ({
        id: q.id,
        order: q.order,
        text: q.text,
        options: q.options,
      })),
    };
  }

  private async submitResponse(
    userId: string,
    type: SurveyType,
    answers: Record<string, string>,
  ): Promise<{ score: number; level: string }> {
    const survey = await this.findSurveyOrThrow(type);
    const questions = parseSurveyQuestions(survey.questionsJson);

    this.assertCompleteAnswers(questions, answers);
    if (
      questions.some(
        (q) => q.options.length > 0 && !q.options.includes(answers[q.id]),
      )
    ) {
      throw new BadRequestException('Answer must match a survey option');
    }
    const score = this.scoreAnswers(questions, answers);

    const existing = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
    });
    if (existing) {
      throw new ConflictException('Esta encuesta ya fue enviada');
    }

    await this.prisma.surveyResponse.create({
      data: {
        userId,
        surveyId: survey.id,
        answersJson: answers,
        score: new Decimal(score),
      },
    });

    const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    return { score, level };
  }

  private scoreAnswers(
    questions: SurveyQuestionJson[],
    answers: Record<string, string>,
  ): number {
    const total = questions.length;
    const gradeable = questions.filter((q) => q.correctAnswer !== null);

    if (gradeable.length > 0) {
      const correct = gradeable.filter(
        (q) => answers[q.id] === q.correctAnswer,
      ).length;
      return Math.round((correct / gradeable.length) * 100);
    }

    // No correct answers defined: full score on completion, partial on incomplete
    return total > 0 && Object.keys(answers).length === total ? 100 : 50;
  }

  private assertCompleteAnswers(
    questions: SurveyQuestionJson[],
    answers: Record<string, string>,
  ): void {
    if (
      questions.length === 0 ||
      new Set(questions.map((q) => q.id)).size !== questions.length
    ) {
      throw new ServiceUnavailableException('Survey definition is invalid');
    }
    const missing = questions.filter(
      (question) =>
        typeof answers[question.id] !== 'string' ||
        !answers[question.id].trim() ||
        answers[question.id].length > 4000,
    );
    if (
      missing.length > 0 ||
      Object.keys(answers).some((id) => !questions.some((q) => q.id === id))
    ) {
      throw new BadRequestException('Debes responder todas las preguntas de la encuesta');
    }
  }

  private assertValidLikertAnswers(
    questions: SurveyQuestionJson[],
    answers: Record<string, string>,
  ): void {
    const invalid = questions.filter((question) => {
      return !/^[1-5]$/.test(answers[question.id]);
    });
    if (invalid.length > 0) {
      throw new BadRequestException('Las respuestas deben estar entre 1 y 5');
    }
  }
}
