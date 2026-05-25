import { Injectable, NotFoundException } from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class DeleteBudgetUseCase {
  constructor(
    private readonly repo: IBudgetRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(userId: string, budgetId: string): Promise<void> {
    const existing = await this.repo.findById(budgetId, userId);
    if (!existing) throw new NotFoundException('Budget not found');
    await this.repo.softDelete(budgetId, userId);
    this.auditLog.record({
      action: 'DELETE_BUDGET',
      resource: 'Budget',
      resourceId: budgetId,
      beforeJson: {
        categoryId: existing.categoryId,
        amountLimit: existing.amountLimit,
        month: existing.month,
        year: existing.year,
      },
    });
  }
}
