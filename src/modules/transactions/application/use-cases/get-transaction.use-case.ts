import { Injectable, NotFoundException } from '@nestjs/common';
import { ITransactionRepository, TransactionWithCategory } from '../../domain/ports/transaction.repository';

@Injectable()
export class GetTransactionUseCase {
  constructor(private readonly repo: ITransactionRepository) {}

  async execute(id: string, userId: string): Promise<TransactionWithCategory> {
    const tx = await this.repo.findByIdWithCategory(id, userId);
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }
}
