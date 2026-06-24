import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  ChatMessage,
  ClassificationResult,
  PersonalizedQuizResult,
  PredictionResult,
  RecommendationResult,
  SpendingContext,
  UserProfile,
} from './AiProvider';
import { classifyTransactionByRules } from './transaction-category-classifier';

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

  async classifyTransaction(description: string, amount: number): Promise<ClassificationResult> {
    return classifyTransactionByRules(description, amount);
  }

  async chat(_messages: ChatMessage[], _userProfile?: UserProfile): Promise<string> {
    return 'El chat con IA no está disponible en modo local.';
  }

  async generatePersonalizedQuiz(_context: SpendingContext, _language: string): Promise<PersonalizedQuizResult> {
    return { questions: [] };
  }
}
