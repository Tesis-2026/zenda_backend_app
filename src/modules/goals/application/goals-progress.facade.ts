import { Injectable } from '@nestjs/common';
import { ISavingsGoalRepository } from '../domain/ports/savings-goal.repository';
import {
  GoalProgressSnapshot,
  IGoalsProgressFacade,
} from '../domain/ports/goals-progress.facade';

@Injectable()
export class GoalsProgressFacade implements IGoalsProgressFacade {
  constructor(private readonly goalsRepo: ISavingsGoalRepository) {}

  async getGoalsProgress(userId: string): Promise<GoalProgressSnapshot[]> {
    const goals = await this.goalsRepo.findAll(userId);
    return goals.map((g) => ({
      name: g.name,
      currentAmount: g.currentAmount,
      targetAmount: g.targetAmount,
      progressPercent: g.progressPercent,
    }));
  }
}
