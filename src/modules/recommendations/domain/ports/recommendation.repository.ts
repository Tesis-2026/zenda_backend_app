import { RecommendationEntity } from '../recommendation.entity';
import { SpendingContext } from '../../../../infra/ai/AiProvider';

export abstract class IRecommendationRepository {
  abstract listActive(userId: string): Promise<RecommendationEntity[]>;
  abstract replaceAll(userId: string, recs: Omit<RecommendationEntity, 'id' | 'createdAt' | 'feedbackAccepted'>[]): Promise<RecommendationEntity[]>;
  abstract submitFeedback(id: string, userId: string, accepted: boolean): Promise<void>;
  abstract getSpendingContext(userId: string): Promise<SpendingContext>;
  abstract getStats(userId: string): Promise<{ total: number; accepted: number; acceptanceRate: number }>;
}
