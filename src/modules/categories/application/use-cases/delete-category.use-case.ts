import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    private readonly repo: ICategoryRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(userId: string, categoryId: string): Promise<void> {
    const category = await this.repo.findById(categoryId, userId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (!category.isOwnedBy(userId)) {
      throw new ForbiddenException('No se pueden eliminar las categorias del sistema');
    }
    const hasTx = await this.repo.hasTransactions(categoryId);
    if (hasTx) {
      throw new ConflictException('No se puede eliminar una categoria con transacciones registradas');
    }
    await this.repo.softDelete(categoryId);
    this.auditLog.record({
      action: 'DELETE_CATEGORY',
      resource: 'Category',
      resourceId: categoryId,
      beforeJson: { name: category.name, type: category.type },
    });
  }
}
