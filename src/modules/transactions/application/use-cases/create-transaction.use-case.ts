import { BadRequestException, Injectable } from '@nestjs/common';
import { BadgesFacade } from '../../../badges/application/facades/badges.facade';
import { ChallengesFacade } from '../../../challenges/application/facades/challenges.facade';
import { CategoriesFacade } from '../../../categories/application/facades/categories.facade';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';
import { deriveCategorySource } from '../../domain/category-source.enum';
import { TransactionType } from '../../domain/transaction-type.enum';
import { ITransactionRepository, TransactionWithCategory } from '../../domain/ports/transaction.repository';

export interface CreateTransactionCommand {
  userId: string;
  categoryId?: string;
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

    const category = await this.categories.resolve({
      userId: cmd.userId,
      categoryId: cmd.categoryId,
      newCategoryName: cmd.newCategoryName,
    });

    const categorySource = deriveCategorySource({
      suggestedCategoryId: cmd.suggestedCategoryId,
      finalCategoryId: category.id,
    });

    const tx = await this.repo.create({
      userId: cmd.userId,
      categoryId: category.id,
      budgetId: cmd.budgetId ?? null,
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
        categorySource: tx.categorySource,
        occurredAt: tx.occurredAt.toISOString(),
      },
    });

    return { ...tx, newlyCompletedChallenges };
  }
}
