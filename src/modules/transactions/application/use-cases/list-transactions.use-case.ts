import { Injectable } from '@nestjs/common';
import { TransactionType } from '../../domain/transaction-type.enum';
import { ITransactionRepository, TransactionWithCategory } from '../../domain/ports/transaction.repository';

export interface ListTransactionsQuery {
  userId: string;
  from?: Date;
  to?: Date;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  skip?: number;
  take?: number;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sort?: 'asc' | 'desc';
}

@Injectable()
export class ListTransactionsUseCase {
  constructor(private readonly repo: ITransactionRepository) {}

  execute(query: ListTransactionsQuery): Promise<TransactionWithCategory[]> {
    return this.repo.findAll(query.userId, {
      from: query.from,
      to: query.to,
      type: query.type,
      categoryId: query.categoryId,
      accountId: query.accountId,
      skip: query.skip,
      take: query.take,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      search: query.search,
      sort: query.sort,
    });
  }
}
