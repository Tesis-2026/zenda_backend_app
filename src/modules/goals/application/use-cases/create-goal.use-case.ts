import { Injectable } from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

export interface CreateGoalCommand {
  userId: string;
  name: string;
  targetAmount: number;
  dueDate?: Date;
}

@Injectable()
export class CreateGoalUseCase {
  constructor(private readonly repo: ISavingsGoalRepository) {}

  execute(cmd: CreateGoalCommand): Promise<SavingsGoalEntity> {
    return this.repo.create({
      userId: cmd.userId,
      name: cmd.name.trim(),
      targetAmount: cmd.targetAmount,
      dueDate: cmd.dueDate,
    });
  }
}
