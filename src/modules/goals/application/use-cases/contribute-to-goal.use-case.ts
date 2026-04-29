import { Injectable, NotFoundException } from '@nestjs/common';
import { IBadgeRepository } from '../../../badges/domain/ports/badge.repository';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

export interface ContributeToGoalCommand {
  userId: string;
  goalId: string;
  amount: number;
}

@Injectable()
export class ContributeToGoalUseCase {
  constructor(
    private readonly repo: ISavingsGoalRepository,
    private readonly badgeRepo: IBadgeRepository,
  ) {}

  async execute(cmd: ContributeToGoalCommand): Promise<SavingsGoalEntity> {
    const goal = await this.repo.findById(cmd.goalId, cmd.userId);
    if (!goal) throw new NotFoundException('Goal not found');

    const newAmount = goal.contribute(cmd.amount);
    const [updated] = await Promise.all([
      this.repo.updateCurrentAmount(cmd.goalId, newAmount),
      this.repo.addContribution(cmd.goalId, cmd.amount),
    ]);

    if (updated.progressPercent >= 100) {
      await this.badgeRepo.awardIfNotEarned(cmd.userId, 'Goal Achieved');
    }

    return updated;
  }
}
