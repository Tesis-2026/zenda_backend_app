import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { GetExpensePredictionUseCase } from '../application/use-cases/get-expense-prediction.use-case';
import { PredictionResponseDto } from './dto/prediction.response.dto';

@ApiTags('Predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly getExpensePrediction: GetExpensePredictionUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('expenses')
  @ApiOperation({ summary: 'Get expense prediction for next month (US-0801)' })
  async expenses(@UserId() userId: string): Promise<PredictionResponseDto> {
    const entity = await this.getExpensePrediction.execute(userId);
    this.analytics.track(userId, 'view_prediction', { modelVersion: entity.modelVersion });
    return PredictionResponseDto.from(entity);
  }
}
