import { PredictionEntity, PredictionType } from '../prediction.entity';
import { SpendingContext } from '../../../../infra/ai/AiProvider';

export abstract class IPredictionRepository {
  abstract findByUserAndPeriod(
    userId: string,
    period: string,
    type: PredictionType,
  ): Promise<PredictionEntity | null>;

  abstract save(prediction: Omit<PredictionEntity, 'id' | 'createdAt'>): Promise<PredictionEntity>;

  abstract upsert(prediction: Omit<PredictionEntity, 'createdAt'>): Promise<PredictionEntity>;

  abstract getSpendingContext(userId: string, monthsBack: number): Promise<SpendingContext>;
}
