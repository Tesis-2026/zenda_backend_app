export type RecommendationType = 'SAVINGS' | 'BUDGET' | 'GOAL';

/**
 * Constructor input for `RecommendationEntity`. Mirrors every field in
 * the Prisma `Recommendation` model so the entity stays faithful to the
 * persisted shape and the response DTO can surface everything (B12).
 */
export type RecommendationProps = {
  id: string;
  userId: string;
  type: RecommendationType;
  message: string;
  suggestedAction: string | null;
  isActive: boolean;
  // AI traceability — supports the >=80% accuracy KPI for the thesis
  modelVersion: string | null;
  source: string | null;
  inputContextJson: unknown;
  // Lifecycle timestamps
  viewedAt: Date | null;
  dismissedAt: Date | null;
  expiresAt: Date | null;
  // Inlined feedback (was a separate 1:1 table pre-Tier B refactor)
  feedbackAccepted: boolean | null;
  feedbackAt: Date | null;
  createdAt: Date;
};

export class RecommendationEntity {
  readonly id: string;
  readonly userId: string;
  readonly type: RecommendationType;
  readonly message: string;
  readonly suggestedAction: string | null;
  readonly isActive: boolean;
  readonly modelVersion: string | null;
  readonly source: string | null;
  readonly inputContextJson: unknown;
  readonly viewedAt: Date | null;
  readonly dismissedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly feedbackAccepted: boolean | null;
  readonly feedbackAt: Date | null;
  readonly createdAt: Date;

  constructor(props: RecommendationProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.type = props.type;
    this.message = props.message;
    this.suggestedAction = props.suggestedAction;
    this.isActive = props.isActive;
    this.modelVersion = props.modelVersion;
    this.source = props.source;
    this.inputContextJson = props.inputContextJson;
    this.viewedAt = props.viewedAt;
    this.dismissedAt = props.dismissedAt;
    this.expiresAt = props.expiresAt;
    this.feedbackAccepted = props.feedbackAccepted;
    this.feedbackAt = props.feedbackAt;
    this.createdAt = props.createdAt;
  }
}
