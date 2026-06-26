import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ITransactionRepository, TransactionWithCategory, UpdateTransactionParams } from '../../domain/ports/transaction.repository';
import { CategorySource, deriveCategorySource } from '../../domain/category-source.enum';
import { TransactionType } from '../../domain/transaction-type.enum';
import { CategoriesFacade } from '../../../categories/application/facades/categories.facade';
import { AccountsService } from '../../../accounts/application/accounts.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface UpdateTransactionCommand {
  id: string;
  userId: string;
  categoryId?: string;
  newCategoryName?: string;
  accountId?: string;
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
    private readonly categories: CategoriesFacade,
    private readonly accounts: AccountsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: UpdateTransactionCommand): Promise<TransactionWithCategory> {
    const existing = await this.repo.findByIdWithCategory(cmd.id, cmd.userId);
    if (!existing) throw new NotFoundException('Transaction not found');

    let categoryId: string | undefined;
    if (cmd.categoryId || cmd.newCategoryName) {
      const resolved = await this.categories.resolve({
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

    // A budget is a spending limit — only expenses draw from one. If this edit
    // makes the transaction an income (or it already is one), clear any
    // (possibly stale) budget link so income is never coupled to a budget.
    const effectiveType = cmd.type ?? existing.type;
    if (effectiveType === TransactionType.TRANSFER) {
      throw new BadRequestException('Transfers must be updated through account-specific flow');
    }
    const clearBudget = effectiveType === TransactionType.INCOME;

    const account = cmd.accountId
      ? await this.accounts.resolveAccountForTransaction({
          userId: cmd.userId,
          accountId: cmd.accountId,
          type: effectiveType,
          description: cmd.description ?? existing.description,
        })
      : undefined;

    const params: UpdateTransactionParams = {
      categoryId,
      accountId: account?.id,
      type: cmd.type,
      amount: cmd.amount,
      currency: cmd.currency,
      description: cmd.description,
      occurredAt,
      categorySource,
      budgetId: clearBudget ? null : undefined,
    };

    const updated = await this.repo.update(cmd.id, cmd.userId, params);

    this.auditLog.record({
      action: 'UPDATE_TRANSACTION',
      resource: 'Transaction',
      resourceId: cmd.id,
      beforeJson: {
        categoryId: existing.categoryId,
        type: existing.type,
        amount: existing.amount,
        description: existing.description,
        occurredAt: existing.occurredAt.toISOString(),
      },
      afterJson: {
        categoryId: updated.categoryId,
        type: updated.type,
        amount: updated.amount,
        description: updated.description,
        occurredAt: updated.occurredAt.toISOString(),
        categorySource: updated.categorySource,
      },
    });

    return updated;
  }
}
