import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class TransactionEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly categoryId: string,
    readonly type: TransactionType,
    readonly amount: Decimal,
    readonly currency: string,
    readonly description: string | null,
    readonly occurredAt: Date,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
  ) {}

  static create(params: {
    id: string;
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: Decimal;
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
