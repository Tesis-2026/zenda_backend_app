import { Injectable, NotFoundException } from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';

@Injectable()
export class DeleteBudgetUseCase {
  constructor(private readonly repo: IBudgetRepository) {}

  async execute(userId: string, budgetId: string): Promise<void> {
    const existing = await this.repo.findById(budgetId, userId);
    if (!existing) throw new NotFoundException('Budget not found');
    return this.repo.softDelete(budgetId, userId);
  }
}
