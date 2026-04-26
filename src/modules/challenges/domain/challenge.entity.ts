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
