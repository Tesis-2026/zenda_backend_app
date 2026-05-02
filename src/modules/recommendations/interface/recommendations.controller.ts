import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { IRecommendationRepository } from '../domain/ports/recommendation.repository';
import { GetRecommendationsUseCase } from '../application/use-cases/get-recommendations.use-case';
import { SubmitFeedbackUseCase } from '../application/use-cases/submit-feedback.use-case';
import { RecommendationResponseDto } from './dto/recommendation.response.dto';
import { FeedbackDto } from './dto/feedback.dto';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly getRecommendations: GetRecommendationsUseCase,
    private readonly submitFeedback: SubmitFeedbackUseCase,
    @Inject(IRecommendationRepository) private readonly recommendationRepository: IRecommendationRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized recommendations (US-0901)' })
  async list(@UserId() userId: string): Promise<RecommendationResponseDto[]> {
    const recs = await this.getRecommendations.execute(userId);
    return recs.map(RecommendationResponseDto.from);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get recommendation acceptance rate stats (US-0902)' })
  async stats(@UserId() userId: string): Promise<{ total: number; accepted: number; acceptanceRate: number }> {
    return this.recommendationRepository.getStats(userId);
  }

  @Post(':id/feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Submit feedback for a recommendation (US-0902)' })
  async feedback(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
    @Body() dto: FeedbackDto,
  ): Promise<void> {
    await this.submitFeedback.execute(id, userId, dto.accepted);
  }
}
