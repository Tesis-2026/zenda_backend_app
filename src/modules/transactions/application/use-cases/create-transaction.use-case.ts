import { BadRequestException, Injectable } from '@nestjs/common';
import { IBadgeRepository } from '../../../badges/domain/ports/badge.repository';
import { VerifyChallengesUseCase } from '../../../challenges/application/use-cases/verify-challenges.use-case';
import { TransactionType } from '../../domain/transaction-type.enum';
import { ITransactionRepository, TransactionWithCategory } from '../../domain/ports/transaction.repository';
import { ResolveCategoryUseCase } from '../../../categories/application/use-cases/resolve-category.use-case';

export interface CreateTransactionCommand {
  userId: string;
  categoryId?: string;
  newCategoryName?: string;
  amount: number;
  currency?: string;
  description?: string;
  type: TransactionType;
  occurredAt?: string;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly repo: ITransactionRepository,
    private readonly resolveCategory: ResolveCategoryUseCase,
    private readonly badgeRepo: IBadgeRepository,
    private readonly verifyChallenges: VerifyChallengesUseCase,
  ) {}

  async execute(cmd: CreateTransactionCommand): Promise<TransactionWithCategory> {
    const occurredAt = cmd.occurredAt ? new Date(cmd.occurredAt) : new Date();
    if (occurredAt > new Date()) {
      throw new BadRequestException('occurredAt cannot be in the future');
    }

    const category = await this.resolveCategory.execute({
      userId: cmd.userId,
      categoryId: cmd.categoryId,
      newCategoryName: cmd.newCategoryName,
    });

    const tx = await this.repo.create({
      userId: cmd.userId,
      categoryId: category.id,
      type: cmd.type,
      amount: cmd.amount,
      currency: cmd.currency ?? 'PEN',
      description: cmd.description,
      occurredAt,
    });

    await this.badgeRepo.awardIfNotEarned(cmd.userId, 'First Transaction');

    const hasStreak = await this.repo.hasConsecutiveDays(cmd.userId, 7);
    if (hasStreak) {
      await this.badgeRepo.awardIfNotEarned(cmd.userId, 'Consistency');
    }

    this.verifyChallenges.execute(cmd.userId).catch(() => void 0);

    return tx;
  }
}
