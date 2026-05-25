import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface UpdateCategoryCommand {
  userId: string;
  categoryId: string;
  name: string;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly repo: ICategoryRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: UpdateCategoryCommand): Promise<CategoryEntity> {
    const category = await this.repo.findById(cmd.categoryId, cmd.userId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (!category.isOwnedBy(cmd.userId)) {
      throw new ForbiddenException('Cannot rename system categories');
    }

    const trimmed = cmd.name.trim();
    const existing = await this.repo.findByNameForUser(trimmed, cmd.userId);
    if (existing && existing.id !== cmd.categoryId) {
      throw new ConflictException(`Category "${trimmed}" already exists`);
    }

    const updated = await this.repo.update(cmd.categoryId, trimmed);

    this.auditLog.record({
      action: 'UPDATE_CATEGORY',
      resource: 'Category',
      resourceId: cmd.categoryId,
      beforeJson: { name: category.name },
      afterJson: { name: updated.name },
    });

    return updated;
  }
}
