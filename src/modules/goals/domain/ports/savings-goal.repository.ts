import { SavingsGoalEntity } from '../savings-goal.entity';

export interface GoalContributionRecord {
  id: string;
  goalId: string;
  amount: number;
  createdAt: Date;
}

export abstract class ISavingsGoalRepository {
  abstract create(params: {
    userId: string;
    name: string;
    targetAmount: number;
    dueDate?: Date;
  }): Promise<SavingsGoalEntity>;

  abstract findAll(userId: string): Promise<SavingsGoalEntity[]>;
  abstract findById(id: string, userId: string): Promise<SavingsGoalEntity | null>;

  abstract updateCurrentAmount(id: string, newAmount: number): Promise<SavingsGoalEntity>;
  abstract softDelete(id: string): Promise<void>;

  abstract addContribution(goalId: string, amount: number): Promise<GoalContributionRecord>;
  abstract findContributions(goalId: string): Promise<GoalContributionRecord[]>;

  abstract complete(id: string): Promise<SavingsGoalEntity>;
}
