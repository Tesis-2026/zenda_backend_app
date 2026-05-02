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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { CreateBudgetUseCase } from '../application/use-cases/create-budget.use-case';
import { ListBudgetsUseCase } from '../application/use-cases/list-budgets.use-case';
import { UpdateBudgetUseCase } from '../application/use-cases/update-budget.use-case';
import { DeleteBudgetUseCase } from '../application/use-cases/delete-budget.use-case';
import { BudgetEntity } from '../domain/budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetResponseDto } from './dto/budget.response.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';

@ApiTags('Budgets')
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly createBudget: CreateBudgetUseCase,
    private readonly listBudgets: ListBudgetsUseCase,
    private readonly updateBudget: UpdateBudgetUseCase,
    private readonly deleteBudget: DeleteBudgetUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget for a category and period' })
  async create(
    @UserId() userId: string,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const entity = await this.createBudget.execute({ userId, ...dto });
    this.analytics.track(userId, 'create_budget', {
      categoryId: dto.categoryId ?? null,
      amountLimit: dto.amountLimit,
      month: dto.month,
      year: dto.year,
    });
    return this.toResponse(entity);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets with current spending and percentage used' })
  async findAll(
    @UserId() userId: string,
    @Query() query: ListBudgetsDto,
  ): Promise<BudgetResponseDto[]> {
    const entities = await this.listBudgets.execute({
      userId,
      month: query.month,
      year: query.year,
    });
    return entities.map((e) => this.toResponse(e));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a budget spending limit' })
  async update(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const entity = await this.updateBudget.execute({
      userId,
      budgetId: id,
      amountLimit: dto.amountLimit,
    });
    return this.toResponse(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget' })
  remove(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.deleteBudget.execute(userId, id);
  }

  private toResponse(entity: BudgetEntity): BudgetResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      categoryId: entity.categoryId,
      categoryName: entity.categoryName,
      amountLimit: entity.amountLimit,
      month: entity.month,
      year: entity.year,
      currentSpent: entity.currentSpent,
      percentageUsed: entity.percentageUsed,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
