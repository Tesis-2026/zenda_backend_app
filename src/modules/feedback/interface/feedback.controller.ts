import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { SubmitFeedbackUseCase } from '../application/use-cases/submit-feedback.use-case';
import { FeedbackKind } from '../domain/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly submitFeedback: SubmitFeedbackUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit app feedback (US-1501)' })
  async create(
    @UserId() userId: string,
    @Body() dto: CreateFeedbackDto,
  ): Promise<{ id: string }> {
    const feedback = await this.submitFeedback.execute({
      userId,
      type: dto.type as FeedbackKind | undefined,
      message: dto.message,
      screenName: dto.screenName,
      rating: dto.rating,
    });

    this.analytics.track(userId, 'submit_feedback', { type: dto.type, rating: dto.rating });

    return { id: feedback.id };
  }
}
