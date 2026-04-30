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
  skip?: number;
  take?: number;
}

export interface UpdateTransactionParams {
  categoryId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  occurredAt?: Date;
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
  abstract findByIdWithCategory(id: string, userId: string): Promise<TransactionWithCategory | null>;
  abstract update(id: string, userId: string, params: UpdateTransactionParams): Promise<TransactionWithCategory>;
  abstract softDelete(id: string): Promise<void>;

  abstract hasConsecutiveDays(userId: string, days: number): Promise<boolean>;
}
