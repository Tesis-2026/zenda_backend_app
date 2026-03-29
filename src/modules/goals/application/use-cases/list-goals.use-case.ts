import { Injectable } from '@nestjs/common';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

@Injectable()
export class ListGoalsUseCase {
  constructor(private readonly repo: ISavingsGoalRepository) {}

  execute(userId: string): Promise<SavingsGoalEntity[]> {
    return this.repo.findAll(userId);
  }
}
