import { TransactionType } from '../transaction-type.enum';
import { TransactionEntity } from '../transaction.entity';

export interface TransactionWithCategory {
  id: string;
  userId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  category: { id: string; name: string } | null;
}

export interface TransactionFilters {
  from?: Date;
  to?: Date;
  type?: TransactionType;
  categoryId?: string;
}

export abstract class ITransactionRepository {
  abstract create(params: {
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description?: string;
    occurredAt: Date;
  }): Promise<TransactionWithCategory>;

  abstract findAll(
    userId: string,
    filters: TransactionFilters,
  ): Promise<TransactionWithCategory[]>;

  abstract findById(id: string, userId: string): Promise<TransactionEntity | null>;
  abstract softDelete(id: string): Promise<void>;
}
