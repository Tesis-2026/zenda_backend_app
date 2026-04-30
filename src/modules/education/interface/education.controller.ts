import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { ListTopicsUseCase } from '../application/use-cases/list-topics.use-case';
import { GetTopicUseCase } from '../application/use-cases/get-topic.use-case';
import { CompleteTopicUseCase } from '../application/use-cases/complete-topic.use-case';
import { GetQuizUseCase } from '../application/use-cases/get-quiz.use-case';
import { SubmitQuizUseCase } from '../application/use-cases/submit-quiz.use-case';
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
    private readonly analytics: AnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all educational topics with user progress (US-1001)' })
  async list(@UserId() userId: string): Promise<TopicResponseDto[]> {
    const topics = await this.listTopics.execute(userId);
    return topics.map(TopicResponseDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get topic detail with full content (US-1001)' })
  async detail(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<TopicResponseDto> {
    const topic = await this.getTopic.execute(id, userId);
    if (!topic) throw new NotFoundException('Topic not found');
    return TopicResponseDto.from(topic);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark topic as completed (US-1001)' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<void> {
    await this.completeTopic.execute(id, userId);
    this.analytics.track(userId, 'complete_topic', { topicId: id });
  }

  @Get(':id/quiz')
  @ApiOperation({ summary: 'Get a quiz question set for a topic (US-1004)' })
  @ApiQuery({ name: 'language', required: false, enum: ['en', 'es'], description: 'Language for questions (default: en)' })
  async quiz(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('language') language = 'en',
  ): Promise<QuizResponseDto> {
    return this.getQuiz.execute({ topicId: id, language });
  }

  @Post(':id/quiz/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit quiz answers and receive score (US-1004)' })
  async quizSubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
    @Body() dto: SubmitQuizDto,
  ): Promise<QuizSubmitResponseDto> {
    const result = await this.submitQuiz.execute({ topicId: id, answers: dto.answers });
    this.analytics.track(userId, 'submit_quiz', { topicId: id, score: result.score });
    return result;
  }
}
