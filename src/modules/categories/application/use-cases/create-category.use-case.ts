import { ConflictException, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface CreateCategoryCommand {
  userId: string;
  name: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    private readonly repo: ICategoryRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: CreateCategoryCommand): Promise<CategoryEntity> {
    const trimmed = cmd.name.trim();
    const existing = await this.repo.findByNameForUser(trimmed, cmd.userId);
    if (existing) {
      throw new ConflictException(`Category "${trimmed}" already exists`);
    }
    const created = await this.repo.create({ name: trimmed, userId: cmd.userId });
    this.auditLog.record({
      action: 'CREATE_CATEGORY',
      resource: 'Category',
      resourceId: created.id,
      afterJson: { name: created.name, type: created.type },
    });
    return created;
  }
}
