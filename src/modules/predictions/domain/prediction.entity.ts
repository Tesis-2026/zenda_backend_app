export type PredictionType = 'INCOME' | 'EXPENSE';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  amount: number;
}

/**
 * Lower/upper bound of the prediction at the chosen confidence level.
 * Derived deterministically from `predictedTotal` + `confidenceLevel`
 * (see `deriveConfidenceInterval`) so the value persisted in the DB is
 * always consistent with the categorical level the AI provider returned.
 */
export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

/**
 * Width of the +/- band around `predictedTotal` for each level.
 * Picked to be wide enough that real spending lands inside the band on
 * a typical month while still narrowing meaningfully as confidence rises.
 */
const CONFIDENCE_BAND: Record<ConfidenceLevel, number> = {
  high: 0.05,
  medium: 0.15,
  low: 0.30,
};

export function deriveConfidenceInterval(
  predictedTotal: number,
  confidenceLevel: ConfidenceLevel,
): ConfidenceInterval {
  const band = CONFIDENCE_BAND[confidenceLevel];
  return {
    lower: Number((predictedTotal * (1 - band)).toFixed(2)),
    upper: Number((predictedTotal * (1 + band)).toFixed(2)),
  };
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
    public readonly confidenceInterval: ConfidenceInterval,
    public readonly narrative: string,
    public readonly modelVersion: string,
    public readonly actualTotal: number | null,
    public readonly accuracy: number | null,
    public readonly createdAt: Date,
  ) {}
}
