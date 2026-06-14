import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from '../../../../infra/ai/ai.module';
import { AiProvider } from '../../../../infra/ai/AiProvider';
import { IRecommendationRepository } from '../../domain/ports/recommendation.repository';
import { RecommendationEntity } from '../../domain/recommendation.entity';

@Injectable()
export class GetRecommendationsUseCase {
  constructor(
    private readonly repo: IRecommendationRepository,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async execute(userId: string): Promise<RecommendationEntity[]> {
    const context = await this.repo.getSpendingContext(userId);

    if (context.months.length === 0) {
      return this.repo.listActive(userId);
    }

    const results = await this.ai.generateRecommendations(context);

    if (results.length === 0) {
      return this.repo.listActive(userId);
    }

    // Record AI provenance so the recommendation-accuracy KPI can be attributed
    // to the model/inputs that produced each row (instead of persisting nulls).
    // `modelVersion` is provider-level granularity (the AiProvider name); the
    // SpendingContext fed to the model is captured as the input context.
    return this.repo.replaceAll(
      userId,
      results.map((r) => ({
        userId,
        type: r.type as RecommendationEntity['type'],
        message: r.message,
        suggestedAction: r.suggestedAction,
        isActive: true,
        modelVersion: this.ai.name,
        source: 'AI',
        inputContextJson: context,
      })),
    );
  }
}
