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

  abstract countByUser(userId: string): Promise<number>;

  /**
   * Persist the observed actuals against a stored prediction so the KPI
   * pipeline (US-015 / "AI accuracy >=80%") can roll up retrospective
   * performance without re-aggregating the transactions table each time.
   */
  abstract recordActuals(
    predictionId: string,
    actualTotal: number,
    accuracyPct: number | null,
  ): Promise<PredictionEntity>;
}
