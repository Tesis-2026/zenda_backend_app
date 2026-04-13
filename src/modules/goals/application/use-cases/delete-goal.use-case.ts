import { Injectable, NotFoundException } from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';

@Injectable()
export class DeleteGoalUseCase {
  constructor(private readonly repo: ISavingsGoalRepository) {}

  async execute(userId: string, goalId: string): Promise<void> {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundException('Goal not found');
    await this.repo.softDelete(goalId);
  }
}
