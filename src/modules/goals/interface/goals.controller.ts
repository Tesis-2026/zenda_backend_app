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
import { DeleteGoalUseCase } from '../application/use-cases/delete-goal.use-case';
import { SavingsGoalEntity } from '../domain/savings-goal.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { GoalResponseDto } from './dto/goal.response.dto';

@ApiTags('Goals')
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly createGoal: CreateGoalUseCase,
    private readonly listGoals: ListGoalsUseCase,
    private readonly contributeToGoal: ContributeToGoalUseCase,
    private readonly deleteGoal: DeleteGoalUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a savings goal' })
  async create(
    @UserId() userId: string,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    const entity = await this.createGoal.execute({ userId, ...dto });
    return this.toResponse(entity);
  }

  @Get()
  @ApiOperation({ summary: 'List savings goals' })
  async findAll(@UserId() userId: string): Promise<GoalResponseDto[]> {
    const entities = await this.listGoals.execute(userId);
    return entities.map((e) => this.toResponse(e));
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Add contribution to a savings goal' })
  async contribute(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContributeGoalDto,
  ): Promise<GoalResponseDto> {
    const entity = await this.contributeToGoal.execute({ userId, goalId: id, amount: dto.amount });
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
      dueDate: entity.dueDate?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      deletedAt: entity.deletedAt?.toISOString() ?? null,
    };
  }
}
