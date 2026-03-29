import { Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly repo: ICategoryRepository) {}

  execute(userId: string): Promise<CategoryEntity[]> {
    return this.repo.findAllForUser(userId);
  }
}
