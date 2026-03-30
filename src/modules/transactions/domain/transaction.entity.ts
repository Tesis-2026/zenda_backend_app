import { TransactionType } from './transaction-type.enum';

export { TransactionType };

export class TransactionEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly categoryId: string,
    readonly type: TransactionType,
    readonly amount: number,
    readonly currency: string,
    readonly description: string | null,
    readonly occurredAt: Date,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
  ) {}

  /** Reconstitute from persistence — no creation invariants applied. */
  static reconstitute(params: {
    id: string;
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description: string | null;
    occurredAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): TransactionEntity {
    return new TransactionEntity(
      params.id,
      params.userId,
      params.categoryId,
      params.type,
      params.amount,
      params.currency,
      params.description,
      params.occurredAt,
      params.createdAt,
      params.updatedAt,
      params.deletedAt,
    );
  }

  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }
}
