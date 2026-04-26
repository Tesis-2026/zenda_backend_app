export type RecommendationType = 'SAVINGS' | 'BUDGET' | 'GOAL';

export class RecommendationEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: RecommendationType,
    public readonly message: string,
    public readonly suggestedAction: string | null,
    public readonly isActive: boolean,
    public readonly feedbackAccepted: boolean | null,
    public readonly createdAt: Date,
  ) {}
}
