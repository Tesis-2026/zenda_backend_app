import { Injectable, NotFoundException } from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class DeleteGoalUseCase {
  constructor(
    private readonly repo: ISavingsGoalRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(userId: string, goalId: string): Promise<void> {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundException('Goal not found');
    await this.repo.softDelete(goalId);
    this.auditLog.record({
      action: 'DELETE_GOAL',
      resource: 'SavingsGoal',
      resourceId: goalId,
      beforeJson: {
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
      },
    });
  }
}
