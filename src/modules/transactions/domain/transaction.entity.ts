import { CategorySource } from './category-source.enum';
import { TransactionType } from './transaction-type.enum';

export { TransactionType };

export class TransactionEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly categoryId: string | null,
    readonly accountId: string | null,
    readonly toAccountId: string | null,
    readonly type: TransactionType,
    readonly amount: number,
    readonly currency: string,
    readonly description: string | null,
    readonly occurredAt: Date,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
    readonly suggestedCategoryId: string | null,
    readonly aiConfidence: number | null,
    readonly categorySource: CategorySource,
  ) {}

  /** Reconstitute from persistence — no creation invariants applied. */
  static reconstitute(params: {
    id: string;
    userId: string;
    categoryId: string | null;
    accountId: string | null;
    toAccountId: string | null;
    type: TransactionType;
    amount: number;
    currency: string;
    description: string | null;
    occurredAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    suggestedCategoryId: string | null;
    aiConfidence: number | null;
    categorySource: CategorySource;
  }): TransactionEntity {
    return new TransactionEntity(
      params.id,
      params.userId,
      params.categoryId,
      params.accountId,
      params.toAccountId,
      params.type,
      params.amount,
      params.currency,
      params.description,
      params.occurredAt,
      params.createdAt,
      params.updatedAt,
      params.deletedAt,
      params.suggestedCategoryId,
      params.aiConfidence,
      params.categorySource,
    );
  }

  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }
}
