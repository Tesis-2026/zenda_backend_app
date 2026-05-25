import { RecommendationEntity, RecommendationType } from '../recommendation.entity';
import { SpendingContext } from '../../../../infra/ai/AiProvider';

/**
 * Shape callers send when batching new recommendations via `replaceAll`.
 * Only the fields the AI provider / use case can sensibly populate are
 * exposed; the repository fills in defaults for everything else
 * (`isActive=true`, lifecycle timestamps null, etc.).
 */
export type RecommendationInput = {
  userId: string;
  type: RecommendationType;
  message: string;
  suggestedAction: string | null;
  // AI traceability — pass through when known so the >=80% accuracy KPI
  // can attribute the recommendation back to its model + inputs (B12).
  modelVersion?: string | null;
  source?: string | null;
  inputContextJson?: unknown;
  expiresAt?: Date | null;
};

export abstract class IRecommendationRepository {
  abstract listActive(userId: string): Promise<RecommendationEntity[]>;
  abstract replaceAll(userId: string, recs: RecommendationInput[]): Promise<RecommendationEntity[]>;
  abstract submitFeedback(id: string, userId: string, accepted: boolean): Promise<void>;
  abstract getSpendingContext(userId: string): Promise<SpendingContext>;
  abstract getStats(userId: string): Promise<{ total: number; accepted: number; acceptanceRate: number }>;
}
