import { ConflictException, Injectable } from '@nestjs/common';
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

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    private readonly repo: IBudgetRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: CreateBudgetCommand): Promise<BudgetEntity> {
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
