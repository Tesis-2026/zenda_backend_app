import { Injectable, NotFoundException } from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

export interface ContributeToGoalCommand {
  userId: string;
  goalId: string;
  amount: number;
}

@Injectable()
export class ContributeToGoalUseCase {
  constructor(private readonly repo: ISavingsGoalRepository) {}

  async execute(cmd: ContributeToGoalCommand): Promise<SavingsGoalEntity> {
    const goal = await this.repo.findById(cmd.goalId, cmd.userId);
    if (!goal) throw new NotFoundException('Goal not found');

    const newAmount = goal.contribute(cmd.amount);
    return this.repo.updateCurrentAmount(cmd.goalId, newAmount);
  }
}
