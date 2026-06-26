import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { FinancialLiteracyLevel, Survey, SurveyType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import {
  parseSurveyQuestions,
  SurveyQuestionJson,
} from '../domain/survey-question.types';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('pre')
  @ApiOperation({ summary: 'Get pre-usage survey questions (US-1201)' })
  @ApiResponse({
    status: 200,
    description: 'Pre-survey definition with embedded questions',
  })
  @ApiNotFoundError('Pre-survey is not seeded')
  @ApiAuthErrors()
  async getPreSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.PRE);
  }

  @Get('post')
  @ApiOperation({ summary: 'Get post-usage survey questions (US-1202)' })
  @ApiResponse({
    status: 200,
    description: 'Post-survey definition with embedded questions',
  })
  @ApiNotFoundError('Post-survey is not seeded')
  @ApiAuthErrors()
  async getPostSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.POST);
  }

  @Post('pre/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit pre-usage survey response (US-1201)' })
  @ApiResponse({
    status: 201,
    description: 'Response recorded; user financialLiteracyLevel updated',
  })
  @ApiValidationError()
  @ApiConflictError('Pre-survey already submitted by this user')
  @ApiAuthErrors()
  async submitPre(
    @UserId() userId: string,
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ score: number; level: string }> {
    const result = await this.submitResponse(
      userId,
      SurveyType.PRE,
      dto.answers,
    );
    const previousProfile = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { financialLiteracyLevel: true, profileCompleted: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        financialLiteracyLevel: result.level as FinancialLiteracyLevel,
        profileCompleted: true,
      },
    });
    // Record the literacy-level change explicitly. `financialLiteracyLevel`
    // is personal data under Law 29733, and the educational-improvement
    // KPI (>=20% pre/post delta) is computed from these values — the
    // audit trail backs both the compliance story and the thesis result.
    this.auditLog.record({
      action: 'SUBMIT_SURVEY_PRE',
      resource: 'SurveyResponse',
      resourceId: userId,
      beforeJson: {
        financialLiteracyLevel: previousProfile.financialLiteracyLevel,
        profileCompleted: previousProfile.profileCompleted,
      },
      afterJson: {
        score: result.score,
        financialLiteracyLevel: result.level,
        profileCompleted: true,
      },
    });
    return result;
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
    @Body() dto: SubmitSurveyDto,
  ): Promise<{ score: number; improvement: number | null }> {
    const postResult = await this.submitResponse(
      userId,
      SurveyType.POST,
      dto.answers,
    );

    const preSurvey = await this.prisma.survey.findFirst({
      where: { type: SurveyType.PRE },
    });
    const preResponse = preSurvey
      ? await this.prisma.surveyResponse.findUnique({
          where: { userId_surveyId: { userId, surveyId: preSurvey.id } },
        })
      : null;

    const improvement = preResponse?.score
      ? Number((postResult.score - preResponse.score.toNumber()).toFixed(2))
      : null;

    this.auditLog.record({
      action: 'SUBMIT_SURVEY_POST',
      resource: 'SurveyResponse',
      resourceId: userId,
      afterJson: {
        score: postResult.score,
        level: postResult.level,
        improvementVsPre: improvement,
      },
    });

    return { ...postResult, improvement };
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
    if (existing) throw new ConflictException('SUS survey already submitted');

    // Standard SUS scoring formula over 10 Likert items
    this.assertCompleteAnswers(questions, dto.answers);
    this.assertValidLikertAnswers(questions, dto.answers);
    let contributionSum = 0;
    for (const question of questions) {
      const raw = parseInt(dto.answers[question.id] ?? '3', 10);
      const contribution = question.order % 2 !== 0 ? raw - 1 : 5 - raw;
      contributionSum += contribution;
    }
    const susScore = Math.round(contributionSum * 2.5);

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
      throw new ConflictException(
        'Satisfaction survey already submitted',
      );
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

    return { preScore, postScore, improvementPercentage };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async findSurveyOrThrow(type: SurveyType): Promise<Survey> {
    const survey = await this.prisma.survey.findFirst({ where: { type } });
    if (!survey) throw new NotFoundException(`${type} survey not configured`);
    return survey;
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

    const score = this.scoreAnswers(questions, answers);

    const existing = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
    });
    if (existing) {
      throw new ConflictException('Survey response already submitted');
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
    const missing = questions.filter(
      (question) => !answers[question.id]?.trim(),
    );
    if (missing.length > 0) {
      throw new BadRequestException('All survey questions must be answered');
    }
  }

  private assertValidLikertAnswers(
    questions: SurveyQuestionJson[],
    answers: Record<string, string>,
  ): void {
    const invalid = questions.filter((question) => {
      const raw = parseInt(answers[question.id] ?? '', 10);
      return !Number.isFinite(raw) || raw < 1 || raw > 5;
    });
    if (invalid.length > 0) {
      throw new BadRequestException('Likert answers must be between 1 and 5');
    }
  }
}
