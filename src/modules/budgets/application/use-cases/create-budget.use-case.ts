import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface CreateBudgetCommand {
  userId: string;
  categoryId?: string;
  name?: string;
  amountLimit: number;
  month: number;
  year: number;
}

/**
 * Cap on active budgets per user per period. Keeping the set small protects the
 * 50/30/20 model and reduces budget-tracking fatigue (the last slot is meant to
 * be a general "Otros" catch-all).
 */
export const MAX_BUDGETS_PER_PERIOD = 7;

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    private readonly repo: IBudgetRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: CreateBudgetCommand): Promise<BudgetEntity> {
    // Enforce the per-period cap. Counting active budgets (not reviving a
    // soft-deleted slot) keeps the check cheap and correct: a revive of a
    // previously deleted slot still becomes a new active budget here.
    const activeCount = await this.repo.countActiveForPeriod(
      cmd.userId,
      cmd.month,
      cmd.year,
    );
    if (activeCount >= MAX_BUDGETS_PER_PERIOD) {
      throw new BadRequestException(
        `Budget limit reached: a maximum of ${MAX_BUDGETS_PER_PERIOD} budgets per period is allowed`,
      );
    }

    // PostgreSQL unique constraints treat NULL as distinct (NULL != NULL), so the
    // @@unique([userId, categoryId, month, year]) on Budget does NOT prevent two
    // global budgets (categoryId = null) for the same period. We enforce it here.
    if (!cmd.categoryId) {
      const existing = await this.repo.findGlobalForPeriod(
        cmd.userId,
        cmd.month,
        cmd.year,
      );
      if (existing) {
        throw new ConflictException(
          'A global budget for this period already exists',
        );
      }
    }

    try {
      const created = await this.repo.create({
        userId: cmd.userId,
        categoryId: cmd.categoryId,
        name: cmd.name,
        amountLimit: cmd.amountLimit,
        month: cmd.month,
        year: cmd.year,
      });
      this.auditLog.record({
        action: 'CREATE_BUDGET',
        resource: 'Budget',
        resourceId: created.id,
        afterJson: {
          categoryId: created.categoryId,
          amountLimit: created.amountLimit,
          month: created.month,
          year: created.year,
        },
      });
      return created;
    } catch (err: unknown) {
      // Prisma P2002 = unique constraint violation (duplicate category-specific budget)
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
