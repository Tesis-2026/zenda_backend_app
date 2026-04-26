export class BadgeEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly criteria: string,
    public readonly iconUrl: string | null,
    public readonly isEarned: boolean,
    public readonly earnedAt: Date | null,
  ) {}
}
