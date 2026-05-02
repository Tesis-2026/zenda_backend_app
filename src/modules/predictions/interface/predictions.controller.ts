import { Body, Controller, Get, HttpCode, HttpStatus, Inject, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { IBadgeRepository } from '../../badges/domain/ports/badge.repository';
import { IPredictionRepository } from '../domain/ports/prediction.repository';
import { GetExpensePredictionUseCase } from '../application/use-cases/get-expense-prediction.use-case';
import { PredictionResponseDto } from './dto/prediction.response.dto';

class AccuracyCheckDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  month!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  year!: number;
}

@ApiTags('Predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly getExpensePrediction: GetExpensePredictionUseCase,
    private readonly analytics: AnalyticsService,
    @Inject(IBadgeRepository) private readonly badgeRepository: IBadgeRepository,
    @Inject(IPredictionRepository) private readonly predictionRepository: IPredictionRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get('expenses')
  @ApiOperation({ summary: 'Get expense prediction for next month (US-0801)' })
  async expenses(@UserId() userId: string): Promise<PredictionResponseDto> {
    const entity = await this.getExpensePrediction.execute(userId);
    this.analytics.track(userId, 'view_prediction', { modelVersion: entity.modelVersion });
    void this.badgeRepository.awardIfNotEarned(userId, 'Predictor');
    return PredictionResponseDto.from(entity);
  }

  @Post('accuracy-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare stored prediction against actual expenses for a past month (US-0801)' })
  async accuracyCheck(
    @UserId() userId: string,
    @Body() dto: AccuracyCheckDto,
  ): Promise<{ period: string; predictedTotal: number; actualTotal: number; accuracyPct: number | null }> {
    const { year, month } = dto;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const prediction = await this.predictionRepository.findByUserAndPeriod(userId, period, 'EXPENSE');
    if (!prediction) {
      throw new NotFoundException(`No stored prediction found for period ${period}`);
    }

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    const agg = await this.prisma.transaction.aggregate({
      where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null },
      _sum: { amount: true },
    });
    const actualTotal = (agg._sum.amount ?? new Decimal(0)).toNumber();

    const predictedTotal = prediction.predictedTotal;
    const accuracyPct =
      actualTotal > 0
        ? Math.round((1 - Math.abs(predictedTotal - actualTotal) / actualTotal) * 10000) / 100
        : null;

    return { period, predictedTotal, actualTotal, accuracyPct };
  }
}
