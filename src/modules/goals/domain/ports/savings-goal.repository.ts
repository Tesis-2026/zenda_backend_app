import { Decimal } from '@prisma/client/runtime/library';
import { SavingsGoalEntity } from '../savings-goal.entity';

export abstract class ISavingsGoalRepository {
  abstract create(params: {
    userId: string;
    name: string;
    targetAmount: number;
    dueDate?: Date;
  }): Promise<SavingsGoalEntity>;

  abstract findAll(userId: string): Promise<SavingsGoalEntity[]>;
  abstract findById(id: string, userId: string): Promise<SavingsGoalEntity | null>;

  abstract updateCurrentAmount(id: string, newAmount: Decimal): Promise<SavingsGoalEntity>;
  abstract softDelete(id: string): Promise<void>;
}
