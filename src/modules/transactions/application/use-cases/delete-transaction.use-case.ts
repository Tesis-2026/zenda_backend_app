import { Injectable, NotFoundException } from '@nestjs/common';
import { ITransactionRepository } from '../../domain/ports/transaction.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    private readonly repo: ITransactionRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(userId: string, transactionId: string): Promise<void> {
    const tx = await this.repo.findById(transactionId, userId);
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.repo.softDelete(transactionId);

    this.auditLog.record({
      action: 'DELETE_TRANSACTION',
      resource: 'Transaction',
      resourceId: transactionId,
      beforeJson: {
        type: tx.type,
        amount: tx.amount,
        categoryId: tx.categoryId,
        occurredAt: tx.occurredAt.toISOString(),
      },
    });
  }
}
