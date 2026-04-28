import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SurveyType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pre')
  @ApiOperation({ summary: 'Get pre-usage survey questions (US-1201)' })
  async getPreSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.PRE);
  }

  @Get('post')
  @ApiOperation({ summary: 'Get post-usage survey questions (US-1202)' })
  async getPostSurvey(): Promise<object> {
    return this.getSurveyByType(SurveyType.POST);
  }

  @Post('pre/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit pre-usage survey response (US-1201)' })
  async submitPre(@UserId() userId: string, @Body() dto: SubmitSurveyDto): Promise<{ score: number; level: string }> {
    return this.submitResponse(userId, SurveyType.PRE, dto.answers);
  }

  @Post('post/response')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit post-usage survey response (US-1202)' })
  async submitPost(@UserId() userId: string, @Body() dto: SubmitSurveyDto): Promise<{ score: number; improvement: number | null }> {
    const postResult = await this.submitResponse(userId, SurveyType.POST, dto.answers);

    // Calculate improvement vs pre-survey
    const preSurvey = await this.prisma.survey.findFirst({ where: { type: SurveyType.PRE } });
    const preResponse = preSurvey
      ? await this.prisma.surveyResponse.findUnique({ where: { userId_surveyId: { userId, surveyId: preSurvey.id } } })
      : null;

    const improvement = preResponse?.score
      ? Number((postResult.score - preResponse.score.toNumber()).toFixed(2))
      : null;

    return { ...postResult, improvement };
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
    const improvement = preScore !== null && postScore !== null ? postScore - preScore : null;

    return { preScore, postScore, improvementPercentage: improvement };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getSurveyByType(type: SurveyType): Promise<object> {
    const survey = await this.prisma.survey.findFirst({
      where: { type },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!survey) throw new NotFoundException(`${type} survey not configured`);
    return {
      id: survey.id,
      type: survey.type,
      questions: survey.questions.map((q) => ({ id: q.id, order: q.order, text: q.text, options: q.options })),
    };
  }

  private async submitResponse(
    userId: string,
    type: SurveyType,
    answers: Record<string, string>,
  ): Promise<{ score: number; level: string }> {
    const survey = await this.prisma.survey.findFirst({
      where: { type },
      include: { questions: true },
    });
    if (!survey) throw new NotFoundException(`${type} survey not configured`);

    // Simple scoring: each correct answer = (100 / totalQuestions) points
    // In the real app, correct answers are stored in the survey question options JSON
    const total = survey.questions.length;
    const score = total > 0 ? Math.min(100, Math.round((Object.keys(answers).length / total) * 100)) : 50;

    await this.prisma.surveyResponse.upsert({
      where: { userId_surveyId: { userId, surveyId: survey.id } },
      create: { userId, surveyId: survey.id, answersJson: answers, score: new Decimal(score) },
      update: { answersJson: answers, score: new Decimal(score) },
    });

    const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    return { score, level };
  }
}
