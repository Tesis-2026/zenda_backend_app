import { BadRequestException, Injectable } from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface CreateGoalCommand {
  userId: string;
  name: string;
  targetAmount: number;
  dueDate?: Date;
}

@Injectable()
export class CreateGoalUseCase {
  constructor(
    private readonly repo: ISavingsGoalRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: CreateGoalCommand): Promise<SavingsGoalEntity> {
    if (cmd.dueDate && cmd.dueDate <= new Date()) {
      throw new BadRequestException('dueDate must be a future date');
    }
    const created = await this.repo.create({
      userId: cmd.userId,
      name: cmd.name.trim(),
      targetAmount: cmd.targetAmount,
      dueDate: cmd.dueDate,
    });
    this.auditLog.record({
      action: 'CREATE_GOAL',
      resource: 'SavingsGoal',
      resourceId: created.id,
      afterJson: {
        name: created.name,
        targetAmount: created.targetAmount,
        dueDate: created.dueDate?.toISOString() ?? null,
      },
    });
    return created;
  }
}
