import { BadRequestException, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';

export interface ResolveCategoryCommand {
  userId: string;
  categoryId?: string;
  newCategoryName?: string;
}

@Injectable()
export class ResolveCategoryUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

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

    return this.repo.create({ name: trimmed, userId });
  }
}
