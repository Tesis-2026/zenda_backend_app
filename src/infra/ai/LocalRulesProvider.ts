import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  ClassificationResult,
  PredictionResult,
  RecommendationResult,
  SpendingContext,
} from './AiProvider';

// Kept for local/offline development only.
// In production, AzureFoundryProvider is the active implementation.
@Injectable()
export class LocalRulesProvider implements AiProvider {
  readonly name = 'local-rules';

  async predictExpenses(_context: SpendingContext): Promise<PredictionResult> {
    return {
      predictedTotal: 0,
      predictedByCategory: [],
      confidenceLevel: 'low',
      narrative: 'Predicción no disponible en modo local.',
      modelVersion: 'local-rules',
    };
  }

  async generateRecommendations(_context: SpendingContext): Promise<RecommendationResult[]> {
    return [];
  }

  async classifyTransaction(_description: string, _amount: number): Promise<ClassificationResult> {
    return { categoryName: 'Otros', confidence: 0 };
  }
}
