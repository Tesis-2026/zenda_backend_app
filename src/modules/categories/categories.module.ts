import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ICategoryRepository } from './domain/ports/category.repository';
import { PrismaCategoryRepository } from './infrastructure/persistence/prisma-category.repository';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { ResolveCategoryUseCase } from './application/use-cases/resolve-category.use-case';
import { CategoriesController } from './interface/categories.controller';
import { CategoriesFacade, CategoriesFacadeImpl } from './application/facades/categories.facade';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    { provide: ICategoryRepository, useClass: PrismaCategoryRepository },
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    DeleteCategoryUseCase,
    UpdateCategoryUseCase,
    ResolveCategoryUseCase,
    { provide: CategoriesFacade, useClass: CategoriesFacadeImpl },
  ],
  // B19: only CategoriesFacade is exported. ResolveCategoryUseCase
  // and ICategoryRepository are module-internal.
  exports: [CategoriesFacade],
})
export class CategoriesModule {}
