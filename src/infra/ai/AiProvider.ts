export interface UserProfile {
  financialLiteracyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  age: number | null;
  university: string | null;
  incomeType: string | null;
  averageMonthlyIncome: number | null;
}

export interface SpendingContext {
  userId: string;
  userProfile: UserProfile;
  months: Array<{
    period: string; // "YYYY-MM"
    categories: Array<{
      categoryId: string;
      categoryName: string;
      totalAmount: number;
      transactionCount: number;
    }>;
    totalExpenses: number;
    totalIncome: number;
  }>;
}

export interface PredictionResult {
  predictedTotal: number;
  predictedByCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
  confidenceLevel: 'high' | 'medium' | 'low';
  narrative: string;
  modelVersion: string;
}

export interface RecommendationResult {
  type: 'SAVINGS' | 'BUDGET' | 'GOAL';
  message: string;
  suggestedAction: string;
}

export interface ClassificationResult {
  categoryName: string;
  confidence: number; // 0-1
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiProvider {
  readonly name: string;
  predictExpenses(context: SpendingContext): Promise<PredictionResult>;
  generateRecommendations(context: SpendingContext): Promise<RecommendationResult[]>;
  classifyTransaction(description: string, amount: number): Promise<ClassificationResult>;
  chat(messages: ChatMessage[], userProfile?: UserProfile): Promise<string>;
}
