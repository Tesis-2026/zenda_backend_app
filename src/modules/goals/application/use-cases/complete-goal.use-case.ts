import { Injectable, NotFoundException } from '@nestjs/common';
import { IBadgeRepository } from '../../../badges/domain/ports/badge.repository';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

@Injectable()
export class CompleteGoalUseCase {
  constructor(
    private readonly repo: ISavingsGoalRepository,
    private readonly badgeRepo: IBadgeRepository,
  ) {}

  async execute(userId: string, goalId: string): Promise<SavingsGoalEntity> {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundException('Goal not found');

    const updated = await this.repo.complete(goalId);
    await this.badgeRepo.awardIfNotEarned(userId, 'Goal Achieved');
    return updated;
  }
}
