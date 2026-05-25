import { Body, ConflictException, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiConflictError, ApiNotFoundError, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { FinancialLiteracyLevel, Survey, SurveyType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import { parseSurveyQuestions, SurveyQuestionJson } from '../domain/survey-question.types';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pre')
  @ApiOperation({ summary: 'Get pre-usage survey questions (US-1201)' })
  @ApiResponse({ status: 200, description: 'Pre-survey definition with embedded questions' })
  @ApiNotFoundError('Pre-survey is not seeded')
  @ApiAuthErrors()
  async getPreSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.PRE);
  }

  @Get('post')
  @ApiOperation({ summary: 'Get post-usage survey questions (US-1202)' })
  @ApiResponse({ status: 200, description: 'Post-survey definition with embedded questions' })
  @ApiNotFoundError('Post-survey is not seeded')
  @ApiAuthErrors()
  async getPostSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.POST);
  }

  @Post('pre/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit pre-usage survey response (US-1201)' })
  @ApiResponse({ status: 201, description: 'Response recorded; user financialLiteracyLevel updated' })
  @ApiValidationError()
  @ApiConflictError('Pre-survey already submitted by this user')
  @ApiAuthErrors()
  async submitPre(@UserId() userId: string, @Body() dto: SubmitSurveyDto): Promise<{ score: number; level: string }> {
    const result = await this.submitResponse(userId, SurveyType.PRE, dto.answers);
    await this.prisma.user.update({
      where: { id: userId },
      data: { financialLiteracyLevel: result.level as FinancialLiteracyLevel, profileCompleted: true },
    });
    return result;
  }

  @Post('post/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit post-usage survey response (US-1202)' })
  @ApiResponse({ status: 201, description: 'Response recorded; returns score + improvement vs pre' })
  @ApiValidationError()
  @ApiConflictError('Post-survey already submitted by this user')
  @ApiAuthErrors()
  async submitPost(@UserId() userId: string, @Body() dto: SubmitSurveyDto): Promise<{ score: number; improvement: number | null }> {
    const postResult = await this.submitResponse(userId, SurveyType.POST, dto.answers);

    const preSurvey = await this.prisma.survey.findFirst({ where: { type: SurveyType.PRE } });
    const preResponse = preSurvey
      ? await this.prisma.surveyResponse.findUnique({ where: { userId_surveyId: { userId, surveyId: preSurvey.id } } })
      : null;

    const improvement = preResponse?.score
      ? Number((postResult.score - preResponse.score.toNumber()).toFixed(2))
      : null;

    return { ...postResult, improvement };
  }

  @Get('sus')
  @ApiOperation({ summary: 'Get SUS usability questionnaire (US-035)' })
  @ApiResponse({ status: 200, description: 'SUS questionnaire with 10 standard items' })
  @ApiNotFoundError('SUS survey is not seeded')
  @ApiAuthErrors()
  async getSusSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.SUS);
  }

  @Post('sus/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit SUS survey response and compute SUS score (US-035)' })
  @ApiResponse({ status: 201, description: 'SUS score (0-100) + grade (Excelente/Bueno/Regular/Bajo)' })
  @ApiValidationError()
  @ApiConflictError('SUS survey already submitted')
  @ApiAuthErrors()
  async submitSus(@UserId() userId: string, @Body() dto: SubmitSurveyDto): Promise<{ susScore: number; grade: string }> {
    const survey = await this.findSurveyOrThrow(SurveyType.SUS);
    const questions = parseSurveyQuestions(survey.questionsJson);

    const existing = await this.prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
    });
    if (existing) throw new ConflictException('SUS survey already submitted');

    // Standard SUS scoring formula over 10 Likert items
    let contributionSum = 0;
    for (const question of questions) {
      const raw = parseInt(dto.answers[question.id] ?? '3', 10);
      const contribution = question.order % 2 !== 0 ? raw - 1 : 5 - raw;
      contributionSum += contribution;
    }
    const susScore = Math.round(contributionSum * 2.5);

    await this.prisma.surveyResponse.create({
      data: { userId, surveyId: survey.id, answersJson: dto.answers, score: new Decimal(susScore) },
    });

    const grade = susScore >= 85 ? 'Excelente' : susScore >= 70 ? 'Bueno' : susScore >= 50 ? 'Regular' : 'Bajo';
    return { susScore, grade };
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Get pre/post comparison for a user (US-1203)' })
  async comparison(@UserId() userId: string): Promise<object> {
    const [preSurvey, postSurvey] = await Promise.all([
      this.prisma.survey.findFirst({ where: { type: SurveyType.PRE } }),
      this.prisma.survey.findFirst({ where: { type: SurveyType.POST } }),
    ]);

    const [preResp, postResp] = await Promise.all([
      preSurvey ? this.prisma.surveyResponse.findUnique({ where: { userId_surveyId: { userId, surveyId: preSurvey.id } } }) : null,
      postSurvey ? this.prisma.surveyResponse.findUnique({ where: { userId_surveyId: { userId, surveyId: postSurvey.id } } }) : null,
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
      questions: questions.map((q) => ({ id: q.id, order: q.order, text: q.text, options: q.options })),
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
      data: { userId, surveyId: survey.id, answersJson: answers, score: new Decimal(score) },
    });

    const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    return { score, level };
  }

  private scoreAnswers(questions: SurveyQuestionJson[], answers: Record<string, string>): number {
    const total = questions.length;
    const gradeable = questions.filter((q) => q.correctAnswer !== null);

    if (gradeable.length > 0) {
      const correct = gradeable.filter((q) => answers[q.id] === q.correctAnswer).length;
      return Math.round((correct / gradeable.length) * 100);
    }

    // No correct answers defined: full score on completion, partial on incomplete
    return total > 0 && Object.keys(answers).length === total ? 100 : 50;
  }
}
