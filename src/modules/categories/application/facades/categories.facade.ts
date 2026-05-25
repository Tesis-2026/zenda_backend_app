import { Injectable } from '@nestjs/common';
import { CategoryEntity } from '../../domain/category.entity';
import { ResolveCategoryUseCase } from '../use-cases/resolve-category.use-case';

/**
 * Request shape for the cross-context category resolution path.
 * Re-declared here (rather than importing the internal command type)
 * so the facade contract is self-contained and consumers never reach
 * into the Categories application layer.
 */
export interface ResolveCategoryRequest {
  userId: string;
  categoryId?: string;
  newCategoryName?: string;
}

/**
 * Public, cross-context contract for the Categories module.
 *
 * Transactions resolves the user-supplied category reference (either
 * an existing `categoryId` or a `newCategoryName` to create on the
 * fly) on both create and update. Before B19 it imported
 * `ResolveCategoryUseCase` directly (ARCH-17). It now depends on this
 * facade instead.
 */
export abstract class CategoriesFacade {
  abstract resolve(request: ResolveCategoryRequest): Promise<CategoryEntity>;
}

@Injectable()
export class CategoriesFacadeImpl extends CategoriesFacade {
  constructor(private readonly resolveUseCase: ResolveCategoryUseCase) {
    super();
  }

  resolve(request: ResolveCategoryRequest): Promise<CategoryEntity> {
    return this.resolveUseCase.execute(request);
  }
}
