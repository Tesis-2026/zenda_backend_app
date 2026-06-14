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
import { Throttle } from '@nestjs/throttler';
import {
  ApiAuthErrors,
  ApiCreated,
  ApiNoContent,
  ApiNotFoundError,
  ApiOk,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { CreateGoalUseCase } from '../application/use-cases/create-goal.use-case';
import { ListGoalsUseCase } from '../application/use-cases/list-goals.use-case';
import { ContributeToGoalUseCase } from '../application/use-cases/contribute-to-goal.use-case';
import { CompleteGoalUseCase } from '../application/use-cases/complete-goal.use-case';
import { DeleteGoalUseCase } from '../application/use-cases/delete-goal.use-case';
import { UpdateGoalUseCase } from '../application/use-cases/update-goal.use-case';
import { ListGoalContributionsUseCase } from '../application/use-cases/list-goal-contributions.use-case';
import { SavingsGoalEntity } from '../domain/savings-goal.entity';
import { GoalContributionRecord } from '../domain/ports/savings-goal.repository';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { GoalResponseDto } from './dto/goal.response.dto';
import { GoalContributionResponseDto } from './dto/goal-contribution.response.dto';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';

@ApiTags('Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly createGoal: CreateGoalUseCase,
    private readonly listGoals: ListGoalsUseCase,
    private readonly contributeToGoal: ContributeToGoalUseCase,
    private readonly completeGoal: CompleteGoalUseCase,
    private readonly deleteGoal: DeleteGoalUseCase,
    private readonly updateGoal: UpdateGoalUseCase,
    private readonly listContributions: ListGoalContributionsUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a savings goal' })
  @ApiCreated(GoalResponseDto, 'Goal created')
  @ApiValidationError()
  @ApiAuthErrors()
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
  @ApiOk(GoalResponseDto, 'List of goals')
  @ApiAuthErrors()
  async findAll(@UserId() userId: string): Promise<GoalResponseDto[]> {
    const entities = await this.listGoals.execute(userId);
    return entities.map((e) => this.toResponse(e));
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'List contributions for a savings goal' })
  @ApiOk(GoalContributionResponseDto, 'List of contributions')
  @ApiNotFoundError('Goal not found or not owned by caller')
  @ApiAuthErrors()
  async getContributions(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalContributionResponseDto[]> {
    const records = await this.listContributions.execute({ userId, goalId: id });
    return records.map((r) => this.toContributionResponse(r));
  }

  @Post(':id/contribute')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Add contribution to a savings goal' })
  @ApiOk(GoalResponseDto, 'Contribution recorded; returns updated goal')
  @ApiValidationError()
  @ApiNotFoundError('Goal not found or not owned by caller')
  @ApiAuthErrors()
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Mark a savings goal as complete (US-0505)' })
  @ApiOk(GoalResponseDto, 'Goal marked complete')
  @ApiNotFoundError('Goal not found or not owned by caller')
  @ApiAuthErrors()
  async complete(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalResponseDto> {
    const entity = await this.completeGoal.execute(userId, id);
    this.analytics.track(userId, 'complete_goal', { goalId: id });
    return this.toResponse(entity);
  }

  @Put(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Update a savings goal (name / target / due date)' })
  @ApiOk(GoalResponseDto, 'Goal updated')
  @ApiValidationError()
  @ApiNotFoundError('Goal not found or not owned by caller')
  @ApiAuthErrors()
  async update(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    const entity = await this.updateGoal.execute({ userId, goalId: id, ...dto });
    this.analytics.track(userId, 'update_goal', { goalId: id });
    return this.toResponse(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a savings goal' })
  @ApiNoContent('Goal deleted')
  @ApiNotFoundError('Goal not found or not owned by caller')
  @ApiAuthErrors()
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
      isCompleted: entity.isCompleted,
      completedAt: entity.completedAt?.toISOString() ?? null,
      dueDate: entity.dueDate?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
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
