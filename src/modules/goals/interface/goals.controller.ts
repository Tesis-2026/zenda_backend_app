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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { CreateGoalUseCase } from '../application/use-cases/create-goal.use-case';
import { ListGoalsUseCase } from '../application/use-cases/list-goals.use-case';
import { ContributeToGoalUseCase } from '../application/use-cases/contribute-to-goal.use-case';
import { CompleteGoalUseCase } from '../application/use-cases/complete-goal.use-case';
import { DeleteGoalUseCase } from '../application/use-cases/delete-goal.use-case';
import { ListGoalContributionsUseCase } from '../application/use-cases/list-goal-contributions.use-case';
import { SavingsGoalEntity } from '../domain/savings-goal.entity';
import { GoalContributionRecord } from '../domain/ports/savings-goal.repository';
import { CreateGoalDto } from './dto/create-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { GoalResponseDto } from './dto/goal.response.dto';
import { GoalContributionResponseDto } from './dto/goal-contribution.response.dto';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';

@ApiTags('Goals')
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly createGoal: CreateGoalUseCase,
    private readonly listGoals: ListGoalsUseCase,
    private readonly contributeToGoal: ContributeToGoalUseCase,
    private readonly completeGoal: CompleteGoalUseCase,
    private readonly deleteGoal: DeleteGoalUseCase,
    private readonly listContributions: ListGoalContributionsUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a savings goal' })
  async create(
    @UserId() userId: string,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    const entity = await this.createGoal.execute({ userId, ...dto });
    this.analytics.track(userId, 'create_goal', { name: dto.name, targetAmount: dto.targetAmount });
    return this.toResponse(entity);
  }

  @Get()
  @ApiOperation({ summary: 'List savings goals' })
  async findAll(@UserId() userId: string): Promise<GoalResponseDto[]> {
    const entities = await this.listGoals.execute(userId);
    return entities.map((e) => this.toResponse(e));
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'List contributions for a savings goal' })
  async getContributions(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalContributionResponseDto[]> {
    const records = await this.listContributions.execute({ userId, goalId: id });
    return records.map((r) => this.toContributionResponse(r));
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Add contribution to a savings goal' })
  async contribute(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContributeGoalDto,
  ): Promise<GoalResponseDto> {
    const entity = await this.contributeToGoal.execute({ userId, goalId: id, amount: dto.amount });
    this.analytics.track(userId, 'contribute_goal', { goalId: id, amount: dto.amount });
    return this.toResponse(entity);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a savings goal as complete (US-0505)' })
  async complete(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalResponseDto> {
    const entity = await this.completeGoal.execute(userId, id);
    this.analytics.track(userId, 'complete_goal', { goalId: id });
    return this.toResponse(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a savings goal' })
  remove(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.deleteGoal.execute(userId, id);
  }

  private toResponse(entity: SavingsGoalEntity): GoalResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      targetAmount: entity.targetAmount,
      currentAmount: entity.currentAmount,
      isCompleted: entity.currentAmount >= entity.targetAmount,
      dueDate: entity.dueDate?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      deletedAt: entity.deletedAt?.toISOString() ?? null,
    };
  }

  private toContributionResponse(record: GoalContributionRecord): GoalContributionResponseDto {
    return {
      id: record.id,
      goalId: record.goalId,
      amount: record.amount,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
