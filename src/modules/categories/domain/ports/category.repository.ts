import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { CategoryEntity } from '../category.entity';

export abstract class ICategoryRepository {
  abstract findAllForUser(userId: string): Promise<CategoryEntity[]>;
  abstract findById(id: string, userId: string): Promise<CategoryEntity | null>;
  abstract findByNameForUser(name: string, userId: string): Promise<CategoryEntity | null>;
  abstract create(params: {
    name: string;
    userId: string;
    transactionType?: TransactionType;
  }): Promise<CategoryEntity>;
  abstract update(id: string, name: string): Promise<CategoryEntity>;
  abstract softDelete(id: string): Promise<void>;
  abstract hasTransactions(categoryId: string): Promise<boolean>;
}
