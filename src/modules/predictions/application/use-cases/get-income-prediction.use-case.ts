import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from '../../../../infra/ai/ai.module';
import { AiProvider } from '../../../../infra/ai/AiProvider';
import { IPredictionRepository } from '../../domain/ports/prediction.repository';
import { PredictionEntity } from '../../domain/prediction.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class GetIncomePredictionUseCase {
  constructor(
    private readonly predictionRepo: IPredictionRepository,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async execute(userId: string): Promise<PredictionEntity> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const period = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    const context = await this.predictionRepo.getSpendingContext(userId, 3);

    const filledMonths = context.months.filter((m) => m.totalIncome > 0);
    if (filledMonths.length < 2) {
      throw new BadRequestException(
        'Se necesitan al menos 2 meses de historial de ingresos para generar una predicción.',
      );
    }

    const result = await this.ai.predictIncome(context);

    return this.predictionRepo.upsert({
      id: randomUUID(),
      userId,
      period,
      type: 'INCOME',
      predictedTotal: result.predictedTotal,
      predictedByCategory: result.predictedByCategory,
      confidenceLevel: result.confidenceLevel,
      narrative: result.narrative,
      modelVersion: result.modelVersion,
      actualTotal: null,
      accuracy: null,
    });
  }
}
