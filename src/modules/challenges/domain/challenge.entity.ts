export type ChallengeStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';

export class ChallengeEntity {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly reward: string | null,
    public readonly status: ChallengeStatus,
    public readonly acceptedAt: Date | null,
    public readonly completedAt: Date | null,
  ) {}
}

// Domain rule: status is derived from the timestamp pair, never persisted separately.
// Kept here (domain layer) so every callsite uses the same single source of truth.
export function deriveChallengeStatus(
  timestamps: { acceptedAt: Date | null; completedAt: Date | null } | null | undefined,
): ChallengeStatus {
  if (!timestamps) return 'AVAILABLE';
  if (timestamps.completedAt !== null) return 'COMPLETED';
  if (timestamps.acceptedAt !== null) return 'ACTIVE';
  return 'AVAILABLE';
}
