import { ConflictException, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';

export interface CreateCategoryCommand {
  userId: string;
  name: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  async execute(cmd: CreateCategoryCommand): Promise<CategoryEntity> {
    const trimmed = cmd.name.trim();
    const existing = await this.repo.findByNameForUser(trimmed, cmd.userId);
    if (existing) {
      throw new ConflictException(`Category "${trimmed}" already exists`);
    }
    return this.repo.create({ name: trimmed, userId: cmd.userId });
  }
}
