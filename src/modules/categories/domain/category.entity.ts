import { CategoryType } from './category-type.enum';
import { TransactionType } from '../../transactions/domain/transaction-type.enum';

export { CategoryType, TransactionType };

export class CategoryEntity {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly type: CategoryType,
    readonly userId: string | null,
    readonly transactionType: TransactionType | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly deletedAt: Date | null,
  ) {}

  isOwnedBy(userId: string): boolean {
    return this.type === CategoryType.CUSTOM && this.userId === userId;
  }

  isAccessibleBy(userId: string): boolean {
    return this.type === CategoryType.SYSTEM || this.userId === userId;
  }

  static create(params: {
    id: string;
    name: string;
    type: CategoryType;
    userId: string | null;
    transactionType: TransactionType | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): CategoryEntity {
    return new CategoryEntity(
      params.id,
      params.name,
      params.type,
      params.userId,
      params.transactionType,
      params.createdAt,
      params.updatedAt,
      params.deletedAt,
    );
  }
}
