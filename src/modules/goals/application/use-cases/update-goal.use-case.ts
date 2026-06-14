import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface UpdateGoalCommand {
  userId: string;
  goalId: string;
  name?: string;
  targetAmount?: number;
  dueDate?: Date;
}

@Injectable()
export class UpdateGoalUseCase {
  constructor(
    private readonly repo: ISavingsGoalRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: UpdateGoalCommand): Promise<SavingsGoalEntity> {
    // findById filters by userId → enforces ownership before the bare update.
    const existing = await this.repo.findById(cmd.goalId, cmd.userId);
    if (!existing) throw new NotFoundException('Goal not found');

    if (cmd.dueDate && cmd.dueDate <= new Date()) {
      throw new BadRequestException('dueDate must be a future date');
    }
    if (
      cmd.targetAmount !== undefined &&
      cmd.targetAmount < existing.currentAmount
    ) {
      throw new BadRequestException(
        'targetAmount cannot be below the amount already saved',
      );
    }

    const updated = await this.repo.update(cmd.goalId, {
      name: cmd.name?.trim(),
      targetAmount: cmd.targetAmount,
      dueDate: cmd.dueDate,
    });

    this.auditLog.record({
      action: 'UPDATE_GOAL',
      resource: 'SavingsGoal',
      resourceId: updated.id,
      beforeJson: {
        name: existing.name,
        targetAmount: existing.targetAmount,
        dueDate: existing.dueDate?.toISOString() ?? null,
      },
      afterJson: {
        name: updated.name,
        targetAmount: updated.targetAmount,
        dueDate: updated.dueDate?.toISOString() ?? null,
      },
    });
    return updated;
  }
}
