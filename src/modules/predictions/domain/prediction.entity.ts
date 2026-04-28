export type PredictionType = 'INCOME' | 'EXPENSE';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export class PredictionEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly period: string,
    public readonly type: PredictionType,
    public readonly predictedTotal: number,
    public readonly predictedByCategory: CategoryPrediction[],
    public readonly confidenceLevel: ConfidenceLevel,
    public readonly narrative: string,
    public readonly modelVersion: string,
    public readonly actualTotal: number | null,
    public readonly accuracy: number | null,
    public readonly createdAt: Date,
  ) {}
}
