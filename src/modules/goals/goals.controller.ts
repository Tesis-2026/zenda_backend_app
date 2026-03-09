import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';
import { UserId } from '../auth/decorators/user-id.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalResponseDto } from './dto/goal.response.dto';
import { GoalsService } from './goals.service';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create savings goal for authenticated user' })
  @ApiBody({ type: CreateGoalDto })
  @ApiOkResponse({ type: GoalResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  create(@UserId() userId: string, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List savings goals for authenticated user' })
  @ApiOkResponse({ type: GoalResponseDto, isArray: true })
  findAll(@UserId() userId: string) {
    return this.goalsService.findAll(userId);
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Contribute amount to one savings goal' })
  @ApiParam({ name: 'id', example: '649fd64f-07b8-4530-938b-21823a4fcbfe' })
  @ApiBody({ type: ContributeGoalDto })
  @ApiOkResponse({ type: GoalResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  contribute(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: ContributeGoalDto,
  ) {
    return this.goalsService.contribute(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete savings goal for authenticated user' })
  @ApiParam({ name: 'id', example: '649fd64f-07b8-4530-938b-21823a4fcbfe' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.goalsService.remove(userId, id);
  }
}
