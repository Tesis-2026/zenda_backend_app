export class BudgetEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly categoryId: string | null,
    readonly categoryName: string | null,
    readonly name: string | null,
    readonly amountLimit: number,
    readonly month: number,
    readonly year: number,
    readonly currentSpent: number,
    readonly incomeAdded: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
  ) {}

  /** Total money in this budget pot = base limit + income assigned to it. */
  get total(): number {
    return this.amountLimit + this.incomeAdded;
  }

  get percentageUsed(): number {
    const denom = this.total;
    if (denom === 0) return 0;
    return Math.min(100, (this.currentSpent / denom) * 100);
  }

  static create(params: {
    id: string;
    userId: string;
    categoryId: string | null;
    categoryName: string | null;
    name: string | null;
    amountLimit: number;
    month: number;
    year: number;
    currentSpent: number;
    incomeAdded: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): BudgetEntity {
    return new BudgetEntity(
      params.id,
      params.userId,
      params.categoryId,
      params.categoryName,
      params.name,
      params.amountLimit,
      params.month,
      params.year,
      params.currentSpent,
      params.incomeAdded,
      params.createdAt,
      params.updatedAt,
      params.deletedAt,
    );
  }
}
