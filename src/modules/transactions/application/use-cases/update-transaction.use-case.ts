import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ITransactionRepository, TransactionWithCategory, UpdateTransactionParams } from '../../domain/ports/transaction.repository';
import { CategorySource, deriveCategorySource } from '../../domain/category-source.enum';
import { TransactionType } from '../../domain/transaction-type.enum';
import { ResolveCategoryUseCase } from '../../../categories/application/use-cases/resolve-category.use-case';

export interface UpdateTransactionCommand {
  id: string;
  userId: string;
  categoryId?: string;
  newCategoryName?: string;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  description?: string;
  occurredAt?: string;
}

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly repo: ITransactionRepository,
    private readonly resolveCategory: ResolveCategoryUseCase,
  ) {}

  async execute(cmd: UpdateTransactionCommand): Promise<TransactionWithCategory> {
    const existing = await this.repo.findByIdWithCategory(cmd.id, cmd.userId);
    if (!existing) throw new NotFoundException('Transaction not found');

    let categoryId: string | undefined;
    if (cmd.categoryId || cmd.newCategoryName) {
      const resolved = await this.resolveCategory.execute({
        userId: cmd.userId,
        categoryId: cmd.categoryId,
        newCategoryName: cmd.newCategoryName,
      });
      categoryId = resolved.id;
    }

    let occurredAt: Date | undefined;
    if (cmd.occurredAt) {
      occurredAt = new Date(cmd.occurredAt);
      if (occurredAt > new Date()) {
        throw new BadRequestException('occurredAt cannot be in the future');
      }
    }

    // If the category changes and the original was AI-derived, recompute the
    // source against the preserved suggestion. This is what flips AI → AI_OVERRIDDEN
    // when the user changes the category after-the-fact.
    let categorySource: CategorySource | undefined;
    if (categoryId !== undefined && existing.suggestedCategoryId) {
      categorySource = deriveCategorySource({
        suggestedCategoryId: existing.suggestedCategoryId,
        finalCategoryId: categoryId,
      });
    }

    const params: UpdateTransactionParams = {
      categoryId,
      type: cmd.type,
      amount: cmd.amount,
      currency: cmd.currency,
      description: cmd.description,
      occurredAt,
      categorySource,
    };

    return this.repo.update(cmd.id, cmd.userId, params);
  }
}
