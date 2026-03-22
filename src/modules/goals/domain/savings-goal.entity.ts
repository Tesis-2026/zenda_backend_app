import { Decimal } from '@prisma/client/runtime/library';

export class SavingsGoalEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly name: string,
    readonly targetAmount: Decimal,
    readonly currentAmount: Decimal,
    readonly dueDate: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
  ) {}

  get progressPercent(): number {
    if (this.targetAmount.isZero()) return 0;
    return Math.min(
      100,
      this.currentAmount.div(this.targetAmount).mul(100).toNumber(),
    );
  }

  contribute(amount: Decimal): Decimal {
    return this.currentAmount.add(amount);
  }

  static create(params: {
    id: string;
    userId: string;
    name: string;
    targetAmount: Decimal;
    currentAmount: Decimal;
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
