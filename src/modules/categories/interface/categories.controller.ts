import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiAuthErrors,
  ApiConflictError,
  ApiCreated,
  ApiNoContent,
  ApiNotFoundError,
  ApiOk,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case';
import { DeleteCategoryUseCase } from '../application/use-cases/delete-category.use-case';
import { UpdateCategoryUseCase } from '../application/use-cases/update-category.use-case';
import { CategoryEntity } from '../domain/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category.response.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom category' })
  @ApiCreated(CategoryResponseDto, 'Category created')
  @ApiValidationError()
  @ApiConflictError('A category with the same name already exists')
  @ApiAuthErrors()
  async create(
    @UserId() userId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const entity = await this.createCategory.execute({ userId, name: dto.name });
    return this.toResponse(entity);
  }

  @Get()
  @ApiOperation({ summary: 'List all accessible categories' })
  @ApiOk(CategoryResponseDto, 'List of categories')
  @ApiAuthErrors()
  async findAll(@UserId() userId: string): Promise<CategoryResponseDto[]> {
    const entities = await this.listCategories.execute(userId);
    return entities.map((e) => this.toResponse(e));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Rename a custom category' })
  @ApiOk(CategoryResponseDto, 'Category updated')
  @ApiValidationError()
  @ApiNotFoundError('Category not found or not owned by caller')
  @ApiAuthErrors()
  async update(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const entity = await this.updateCategory.execute({ userId, categoryId: id, name: dto.name });
    return this.toResponse(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom category' })
  @ApiNoContent('Category deleted')
  @ApiNotFoundError('Category not found or not owned by caller')
  @ApiConflictError('Category still has active transactions')
  @ApiAuthErrors()
  remove(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.deleteCategory.execute(userId, id);
  }

  private toResponse(entity: CategoryEntity): CategoryResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type as 'SYSTEM' | 'CUSTOM',
      icon: entity.icon,
      transactionType: entity.transactionType as 'INCOME' | 'EXPENSE' | null,
      userId: entity.userId,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
