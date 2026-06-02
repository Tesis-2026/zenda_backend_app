import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiNoContent, ApiNotFoundError, ApiOk, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { ListTopicsUseCase } from '../application/use-cases/list-topics.use-case';
import { GetTopicUseCase } from '../application/use-cases/get-topic.use-case';
import { CompleteTopicUseCase } from '../application/use-cases/complete-topic.use-case';
import { GetQuizUseCase } from '../application/use-cases/get-quiz.use-case';
import { SubmitQuizUseCase } from '../application/use-cases/submit-quiz.use-case';
import { GetPersonalizedQuizUseCase } from '../application/use-cases/get-personalized-quiz.use-case';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { TopicResponseDto } from './dto/topic.response.dto';
import { QuizResponseDto, QuizSubmitResponseDto } from './dto/quiz-response.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@ApiTags('Education')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('education/topics')
export class EducationController {
  constructor(
    private readonly listTopics: ListTopicsUseCase,
    private readonly getTopic: GetTopicUseCase,
    private readonly completeTopic: CompleteTopicUseCase,
    private readonly getQuiz: GetQuizUseCase,
    private readonly submitQuiz: SubmitQuizUseCase,
    private readonly getPersonalizedQuiz: GetPersonalizedQuizUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all educational topics with user progress (US-1001)' })
  @ApiOk(TopicResponseDto, 'List of topics with per-user completion + score')
  @ApiAuthErrors()
  async list(@UserId() userId: string): Promise<TopicResponseDto[]> {
    const topics = await this.listTopics.execute(userId);
    return topics.map(TopicResponseDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get topic detail with full content (US-1001)' })
  @ApiOk(TopicResponseDto, 'Topic details')
  @ApiNotFoundError('Topic not found')
  @ApiAuthErrors()
  async detail(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<TopicResponseDto> {
    const topic = await this.getTopic.execute(id, userId);
    if (!topic) throw new NotFoundException('Topic not found');
    this.analytics.track(userId, 'view_topic', { topicId: id });
    return TopicResponseDto.from(topic);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark topic as completed (US-1001)' })
  @ApiNoContent('Topic marked complete')
  @ApiAuthErrors()
  async complete(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<void> {
    await this.completeTopic.execute(id, userId);
    this.analytics.track(userId, 'complete_topic', { topicId: id });
  }

  @Get(':id/quiz')
  @ApiOperation({ summary: 'Get a quiz question set for a topic (US-1004)' })
  @ApiQuery({ name: 'language', required: false, enum: ['en', 'es'], description: 'Language for questions (default: en)' })
  @ApiOk(QuizResponseDto, 'Quiz question set for the topic + language')
  @ApiAuthErrors()
  async quiz(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('language') language = 'en',
  ): Promise<QuizResponseDto> {
    return this.getQuiz.execute({ topicId: id, language });
  }

  @Post(':id/quiz/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit quiz answers and receive score (US-1004)' })
  @ApiOk(QuizSubmitResponseDto, 'Score + per-question feedback')
  @ApiValidationError('answers map exceeds bounds or contains invalid keys')
  @ApiAuthErrors()
  async quizSubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
    @Body() dto: SubmitQuizDto,
  ): Promise<QuizSubmitResponseDto> {
    const result = await this.submitQuiz.execute({ topicId: id, answers: dto.answers });
    this.analytics.track(userId, 'submit_quiz', { topicId: id, score: result.score });

    // US-1004 / AC.5: a HIGH score completes the topic, which in turn
    // triggers the "Financial Sage" badge once every topic is done.
    // CompleteTopicUseCase is idempotent (upsert) so re-running is safe.
    if (result.level === 'HIGH') {
      await this.completeTopic.execute(id, userId);
    }

    return result;
  }
}

// ─── Personalized Quiz Controller (US-1006/US-1007) ───────────────────────────

@ApiTags('Education')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('education/quiz')
export class PersonalizedQuizController {
  constructor(
    private readonly getPersonalizedQuiz: GetPersonalizedQuizUseCase,
    private readonly submitQuiz: SubmitQuizUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('personalized')
  @ApiOperation({ summary: 'Generate AI-personalized quiz based on spending habits (US-1007), max 5/day' })
  @ApiQuery({ name: 'language', required: false, enum: ['en', 'es'] })
  @ApiAuthErrors()
  async personalized(
    @UserId() userId: string,
    @Query('language') language = 'es',
  ) {
    const lang = language === 'es' ? 'es' : 'en';
    const result = await this.getPersonalizedQuiz.execute({ userId, language });
    this.analytics.track(userId, 'quiz_personalized', { language: lang });
    return result;
  }

  @Post('personalized/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit personalized quiz answers (US-1007)' })
  @ApiOk(QuizSubmitResponseDto, 'Score + per-question feedback')
  @ApiValidationError()
  @ApiAuthErrors()
  async submitPersonalized(
    @UserId() userId: string,
    @Body() dto: SubmitQuizDto,
  ): Promise<QuizSubmitResponseDto> {
    const result = await this.submitQuiz.execute({ topicId: 'personalized', answers: dto.answers });
    this.analytics.track(userId, 'submit_quiz_personalized', { score: result.score });
    return result;
  }
}
