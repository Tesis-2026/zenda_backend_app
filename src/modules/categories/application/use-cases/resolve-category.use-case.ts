import { BadRequestException, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface ResolveCategoryCommand {
  userId: string;
  categoryId?: string;
  newCategoryName?: string;
}

@Injectable()
export class ResolveCategoryUseCase {
  constructor(
    private readonly repo: ICategoryRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: ResolveCategoryCommand): Promise<CategoryEntity> {
    const { userId, categoryId, newCategoryName } = cmd;

    if (categoryId && newCategoryName) {
      throw new BadRequestException('Provide categoryId or newCategoryName, not both');
    }
    if (!categoryId && !newCategoryName) {
      throw new BadRequestException('Provide either categoryId or newCategoryName');
    }

    if (categoryId) {
      const category = await this.repo.findById(categoryId, userId);
      if (!category) throw new BadRequestException('Category not found or not accessible');
      return category;
    }

    const trimmed = newCategoryName!.trim();
    const existing = await this.repo.findByNameForUser(trimmed, userId);
    if (existing) return existing;

    // Implicit category creation triggered from create/update-transaction
    // when the user types a brand new category name. CreateCategoryUseCase
    // audits its own writes, but that path isn't taken here — record it
    // explicitly so the audit trail catches every Category row insert.
    const created = await this.repo.create({ name: trimmed, userId });
    this.auditLog.record({
      action: 'CREATE_CATEGORY',
      resource: 'Category',
      resourceId: created.id,
      afterJson: { name: created.name, source: 'resolve-on-create-transaction' },
    });
    return created;
  }
}
