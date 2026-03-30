import { Injectable, NotFoundException } from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';

export interface UpdateBudgetCommand {
  userId: string;
  budgetId: string;
  amountLimit: number;
}

@Injectable()
export class UpdateBudgetUseCase {
  constructor(private readonly repo: IBudgetRepository) {}

  async execute(cmd: UpdateBudgetCommand): Promise<BudgetEntity> {
    const existing = await this.repo.findById(cmd.budgetId, cmd.userId);
    if (!existing) throw new NotFoundException('Budget not found');
    return this.repo.update(cmd.budgetId, cmd.userId, {
      amountLimit: cmd.amountLimit,
    });
  }
}
