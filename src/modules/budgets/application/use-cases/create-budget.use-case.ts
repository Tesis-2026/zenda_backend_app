import { ConflictException, Injectable } from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';

export interface CreateBudgetCommand {
  userId: string;
  categoryId?: string;
  amountLimit: number;
  month: number;
  year: number;
}

@Injectable()
export class CreateBudgetUseCase {
  constructor(private readonly repo: IBudgetRepository) {}

  async execute(cmd: CreateBudgetCommand): Promise<BudgetEntity> {
    try {
      return await this.repo.create({
        userId: cmd.userId,
        categoryId: cmd.categoryId,
        amountLimit: cmd.amountLimit,
        month: cmd.month,
        year: cmd.year,
      });
    } catch (err: unknown) {
      // Prisma P2002 = unique constraint violation (duplicate budget for same category+period)
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'A budget for this category and period already exists',
        );
      }
      throw err;
    }
  }
}
