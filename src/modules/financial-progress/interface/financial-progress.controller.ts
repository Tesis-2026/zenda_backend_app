import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiNotFoundError, ApiOk } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetCurrentPeriodProgressUseCase } from '../application/use-cases/get-current-period-progress.use-case';
import { ListUserProgressUseCase } from '../application/use-cases/list-user-progress.use-case';
import { FinancialProgressEntity } from '../domain/financial-progress.entity';
import { FinancialProgressResponseDto } from './dto/financial-progress.response.dto';
import { ListProgressDto } from './dto/list-progress.dto';

@ApiTags('Financial Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial-progress')
export class FinancialProgressController {
  constructor(
    private readonly listProgress: ListUserProgressUseCase,
    private readonly getCurrent: GetCurrentPeriodProgressUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List monthly financial-progress snapshots for the authenticated user' })
  @ApiOk(FinancialProgressResponseDto, 'Monthly snapshots filtered by from/to (YYYY-MM)')
  @ApiAuthErrors()
  async findAll(
    @UserId() userId: string,
    @Query() query: ListProgressDto,
  ): Promise<FinancialProgressResponseDto[]> {
    const snapshots = await this.listProgress.execute({
      userId,
      from: query.from,
      to: query.to,
    });
    return snapshots.map((s) => this.toResponse(s));
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the snapshot for the current month, if one has been generated' })
  @ApiOk(FinancialProgressResponseDto, 'Current-month snapshot')
  @ApiNotFoundError('No snapshot generated for the current month yet')
  @ApiAuthErrors()
  async findCurrent(@UserId() userId: string): Promise<FinancialProgressResponseDto> {
    const snapshot = await this.getCurrent.execute(userId);
    return this.toResponse(snapshot);
  }

  private toResponse(e: FinancialProgressEntity): FinancialProgressResponseDto {
    return {
      id: e.id,
      userId: e.userId,
      period: e.period,
      budgetComplianceScore: e.budgetComplianceScore,
      savingsRatePct: e.savingsRatePct,
      overspendCategoriesCount: e.overspendCategoriesCount,
      recommendationsShown: e.recommendationsShown,
      recommendationsAccepted: e.recommendationsAccepted,
      recommendationAcceptanceRate: e.recommendationAcceptanceRate,
      quizzesCompleted: e.quizzesCompleted,
      avgQuizScore: e.avgQuizScore,
      createdAt: e.createdAt.toISOString(),
    };
  }
}
