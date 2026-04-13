import { Injectable, NotFoundException } from '@nestjs/common';
import { ITransactionRepository } from '../../domain/ports/transaction.repository';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(private readonly repo: ITransactionRepository) {}

  async execute(userId: string, transactionId: string): Promise<void> {
    const tx = await this.repo.findById(transactionId, userId);
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.repo.softDelete(transactionId);
  }
}
