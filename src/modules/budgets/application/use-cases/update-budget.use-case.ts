import { Injectable, NotFoundException } from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface UpdateBudgetCommand {
  userId: string;
  budgetId: string;
  amountLimit: number;
}

@Injectable()
export class UpdateBudgetUseCase {
  constructor(
    private readonly repo: IBudgetRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: UpdateBudgetCommand): Promise<BudgetEntity> {
    const existing = await this.repo.findById(cmd.budgetId, cmd.userId);
    if (!existing) throw new NotFoundException('Budget not found');
    const updated = await this.repo.update(cmd.budgetId, cmd.userId, {
      amountLimit: cmd.amountLimit,
    });
    this.auditLog.record({
      action: 'UPDATE_BUDGET',
      resource: 'Budget',
      resourceId: cmd.budgetId,
      beforeJson: { amountLimit: existing.amountLimit },
      afterJson: { amountLimit: updated.amountLimit },
    });
    return updated;
  }
}
