export class SavingsGoalEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly name: string,
    readonly targetAmount: number,
    readonly currentAmount: number,
    readonly dueDate: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
  ) {}

  get progressPercent(): number {
    if (this.targetAmount === 0) return 0;
    return Math.min(100, (this.currentAmount / this.targetAmount) * 100);
  }

  contribute(amount: number): number {
    if (amount <= 0) throw new Error('Contribution amount must be positive');
    return this.currentAmount + amount;
  }

  static create(params: {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): SavingsGoalEntity {
    return new SavingsGoalEntity(
      params.id,
      params.userId,
      params.name,
      params.targetAmount,
      params.currentAmount,
      params.dueDate,
      params.createdAt,
      params.updatedAt,
      params.deletedAt,
    );
  }
}
