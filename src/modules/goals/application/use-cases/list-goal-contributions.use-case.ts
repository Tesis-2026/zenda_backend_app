import { Injectable, NotFoundException } from '@nestjs/common';
import { ISavingsGoalRepository, GoalContributionRecord } from '../../domain/ports/savings-goal.repository';

export interface ListGoalContributionsQuery {
  userId: string;
  goalId: string;
}

@Injectable()
export class ListGoalContributionsUseCase {
  constructor(private readonly repo: ISavingsGoalRepository) {}

  async execute(query: ListGoalContributionsQuery): Promise<GoalContributionRecord[]> {
    // Verify ownership before returning contributions
    const goal = await this.repo.findById(query.goalId, query.userId);
    if (!goal) throw new NotFoundException('Goal not found');

    return this.repo.findContributions(query.goalId);
  }
}
