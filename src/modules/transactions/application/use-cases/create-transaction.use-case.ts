import { BadRequestException, Injectable } from '@nestjs/common';
import { BadgesFacade } from '../../../badges/application/facades/badges.facade';
import { ChallengesFacade } from '../../../challenges/application/facades/challenges.facade';
import { CategoriesFacade } from '../../../categories/application/facades/categories.facade';
import { AccountsService } from '../../../accounts/application/accounts.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';
import { deriveCategorySource } from '../../domain/category-source.enum';
import { TransactionType } from '../../domain/transaction-type.enum';
import { ITransactionRepository, TransactionWithCategory } from '../../domain/ports/transaction.repository';

export interface CreateTransactionCommand {
  userId: string;
  categoryId?: string;
  accountId?: string;
  budgetId?: string;
  newCategoryName?: string;
  amount: number;
  currency?: string;
  description?: string;
  type: TransactionType;
  occurredAt?: string;
  // AI provenance — both must be sent together, or neither
  suggestedCategoryId?: string;
  aiConfidence?: number;
}

export type CreateTransactionResult = TransactionWithCategory & {
  newlyCompletedChallenges: string[];
};

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly repo: ITransactionRepository,
    private readonly categories: CategoriesFacade,
    private readonly accounts: AccountsService,
    private readonly badges: BadgesFacade,
    private readonly challenges: ChallengesFacade,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: CreateTransactionCommand): Promise<CreateTransactionResult> {
    const occurredAt = cmd.occurredAt ? new Date(cmd.occurredAt) : new Date();
    if (occurredAt > new Date()) {
      throw new BadRequestException('occurredAt cannot be in the future');
    }

    // AI fields are paired: either both or neither.
    const hasSuggestion = cmd.suggestedCategoryId !== undefined;
    const hasConfidence = cmd.aiConfidence !== undefined;
    if (hasSuggestion !== hasConfidence) {
      throw new BadRequestException(
        'suggestedCategoryId and aiConfidence must be sent together',
      );
    }
    if (hasConfidence && (cmd.aiConfidence! < 0 || cmd.aiConfidence! > 1)) {
      throw new BadRequestException('aiConfidence must be between 0 and 1');
    }

    if (cmd.type === TransactionType.TRANSFER) {
      throw new BadRequestException('Use /accounts/transfer to move money between accounts');
    }

    const [category, account] = await Promise.all([
      this.categories.resolve({
        userId: cmd.userId,
        categoryId: cmd.categoryId,
        newCategoryName: cmd.newCategoryName,
      }),
      this.accounts.resolveAccountForTransaction({
        userId: cmd.userId,
        accountId: cmd.accountId,
        type: cmd.type,
        description: cmd.description,
      }),
    ]);

    const categorySource = deriveCategorySource({
      suggestedCategoryId: cmd.suggestedCategoryId,
      finalCategoryId: category.id,
    });

    // A budget is a spending limit, so only expenses draw from one. Income is a
    // first-class concept tracked on its own (see docs/income-as-first-class-concept.md),
    // so any budgetId sent alongside an income is ignored.
    const budgetId =
      cmd.type === TransactionType.EXPENSE ? (cmd.budgetId ?? null) : null;

    const tx = await this.repo.create({
      userId: cmd.userId,
      categoryId: category.id,
      accountId: account.id,
      budgetId,
      type: cmd.type,
      amount: cmd.amount,
      currency: cmd.currency ?? 'PEN',
      description: cmd.description,
      occurredAt,
      suggestedCategoryId: cmd.suggestedCategoryId ?? null,
      aiConfidence: cmd.aiConfidence ?? null,
      categorySource,
    });

    await this.badges.awardIfNotEarned(cmd.userId, 'First Transaction');

    const hasStreak = await this.repo.hasConsecutiveDays(cmd.userId, 7);
    if (hasStreak) {
      await this.badges.awardIfNotEarned(cmd.userId, 'Consistency');
    }

    const newlyCompletedChallenges = await this.challenges
      .verifyForUser(cmd.userId)
      .catch(() => [] as string[]);

    this.auditLog.record({
      action: 'CREATE_TRANSACTION',
      resource: 'Transaction',
      resourceId: tx.id,
      afterJson: {
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        categorySource: tx.categorySource,
        occurredAt: tx.occurredAt.toISOString(),
      },
    });

    return { ...tx, newlyCompletedChallenges };
  }
}
