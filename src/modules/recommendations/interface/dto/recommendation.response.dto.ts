import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationEntity } from '../../domain/recommendation.entity';

/**
 * Full response shape for `GET /recommendations`. Closes ARCH-09 (B12)
 * by exposing every field the entity carries — lifecycle timestamps,
 * inlined feedback, and AI traceability — so the frontend can render
 * the full UX and compute the >=80% AI accuracy KPI.
 */
export class RecommendationResponseDto {
  @ApiProperty({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  id!: string;

  @ApiProperty({ enum: ['SAVINGS', 'BUDGET', 'GOAL'] })
  type!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true })
  suggestedAction!: string | null;

  @ApiProperty({
    description:
      'Recommendations are batched: every new generation deactivates the previous ones. Use this to filter stale entries on the client.',
    example: true,
  })
  isActive!: boolean;

  // ── Lifecycle timestamps ────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'When the user first viewed this recommendation (UX telemetry).',
    nullable: true,
    example: '2026-05-24T18:00:00.000Z',
  })
  viewedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the user dismissed the recommendation. Implies `isActive: false`.',
    nullable: true,
    example: null,
  })
  dismissedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Server-defined expiry. Older than this and the rec should not be shown.',
    nullable: true,
    example: '2026-06-30T23:59:59.000Z',
  })
  expiresAt!: Date | null;

  // ── Inlined feedback (replaces the old RecommendationFeedback 1:1 table) ─

  @ApiPropertyOptional({
    description: 'Whether the user accepted (true) or rejected (false) the recommendation; null = no feedback yet.',
    nullable: true,
    example: true,
  })
  feedbackAccepted!: boolean | null;

  @ApiPropertyOptional({
    description: 'When feedback was submitted. Always null when `feedbackAccepted` is null.',
    nullable: true,
    example: '2026-05-24T18:05:00.000Z',
  })
  feedbackAt!: Date | null;

  // ── AI traceability (supports the >=80% accuracy KPI) ──────────────

  @ApiPropertyOptional({
    description: 'Identifier for the model that produced the rec, e.g. "rules-v1" or "azure-foundry-gpt-4o-2024-08-06".',
    nullable: true,
    example: 'azure-foundry-gpt-4o-2024-08-06',
  })
  modelVersion!: string | null;

  @ApiPropertyOptional({
    description: 'Provider that emitted the rec, e.g. "local-rules" or "azure-foundry". Lets the dashboard segment accuracy by source.',
    nullable: true,
    example: 'azure-foundry',
  })
  source!: string | null;

  @ApiPropertyOptional({
    description:
      'Snapshot of the inputs the provider used (period totals, budget usage, etc.). Stored as opaque JSON; shape is provider-specific.',
    nullable: true,
  })
  inputContextJson!: unknown;

  @ApiProperty()
  createdAt!: Date;

  static from(e: RecommendationEntity): RecommendationResponseDto {
    const dto = new RecommendationResponseDto();
    dto.id = e.id;
    dto.type = e.type;
    dto.message = e.message;
    dto.suggestedAction = e.suggestedAction;
    dto.isActive = e.isActive;
    dto.viewedAt = e.viewedAt;
    dto.dismissedAt = e.dismissedAt;
    dto.expiresAt = e.expiresAt;
    dto.feedbackAccepted = e.feedbackAccepted;
    dto.feedbackAt = e.feedbackAt;
    dto.modelVersion = e.modelVersion;
    dto.source = e.source;
    dto.inputContextJson = e.inputContextJson;
    dto.createdAt = e.createdAt;
    return dto;
  }
}
