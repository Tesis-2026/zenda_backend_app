export type ChallengeStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export class ChallengeEntity {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly reward: string | null,
    public readonly status: ChallengeStatus,
    public readonly acceptedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly expiresAt: Date | null = null,
    public readonly pointsReward: number = 0,
  ) {}
}

/**
 * Derive challenge status from the user-challenge pair plus the
 * challenge's own duration window.
 *
 * Status rules (single source of truth — used everywhere):
 *   - completedAt set                                   → COMPLETED
 *   - acceptedAt set + within duration window           → ACTIVE
 *   - acceptedAt set + window elapsed without complete  → EXPIRED
 *   - acceptedAt null                                   → AVAILABLE
 *
 * `durationDays` comes from `Challenge.criteriaJson.durationDays`
 * (or `.periodDays`); when neither is present the challenge is treated
 * as open-ended and never expires.
 */
export function deriveChallengeStatus(
  timestamps: { acceptedAt: Date | null; completedAt: Date | null } | null | undefined,
  durationDays?: number | null,
  now: Date = new Date(),
): ChallengeStatus {
  if (!timestamps) return 'AVAILABLE';
  if (timestamps.completedAt !== null) return 'COMPLETED';
  if (timestamps.acceptedAt !== null) {
    if (durationDays && durationDays > 0) {
      const deadline = new Date(timestamps.acceptedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      if (deadline.getTime() < now.getTime()) return 'EXPIRED';
    }
    return 'ACTIVE';
  }
  return 'AVAILABLE';
}

/**
 * Pulls the duration window from a challenge's criteriaJson without
 * coupling callers to the JSON shape. Returns null when no window is set.
 */
export function extractDurationDays(criteriaJson: unknown): number | null {
  if (criteriaJson === null || typeof criteriaJson !== 'object') return null;
  const c = criteriaJson as Record<string, unknown>;
  const candidate = c.durationDays ?? c.periodDays;
  return typeof candidate === 'number' && candidate > 0 ? candidate : null;
}
