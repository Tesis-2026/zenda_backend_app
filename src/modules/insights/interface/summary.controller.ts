import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetMonthSummaryUseCase } from '../application/use-cases/get-month-summary.use-case';
import { GetWeekSummaryUseCase } from '../application/use-cases/get-week-summary.use-case';
import { GetDaySummaryUseCase } from '../application/use-cases/get-day-summary.use-case';
import { GetMonthComparisonUseCase } from '../application/use-cases/get-month-comparison.use-case';
import { MonthSummaryDto } from './dto/month-summary.dto';
import { MonthSummaryResponseDto } from './dto/month-summary.response.dto';
import { WeekSummaryDto } from './dto/week-summary.dto';
import { DaySummaryDto } from './dto/day-summary.dto';
import { ComparisonDto } from './dto/comparison.dto';
import { MonthComparisonEntryDto } from './dto/comparison.response.dto';

@ApiTags('Insights')
@UseGuards(JwtAuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(
    private readonly getMonthSummary: GetMonthSummaryUseCase,
    private readonly getWeekSummary: GetWeekSummaryUseCase,
    private readonly getDaySummary: GetDaySummaryUseCase,
    private readonly getMonthComparison: GetMonthComparisonUseCase,
  ) {}

  @Get('month')
  @ApiOperation({ summary: 'Get income/expense summary for a given month' })
  getMonth(
    @UserId() userId: string,
    @Query() query: MonthSummaryDto,
  ): Promise<MonthSummaryResponseDto> {
    return this.getMonthSummary.execute({ userId, year: query.year, month: query.month });
  }

  @Get('week')
  @ApiOperation({ summary: 'Get income/expense summary for a given ISO week' })
  getWeek(
    @UserId() userId: string,
    @Query() query: WeekSummaryDto,
  ): Promise<MonthSummaryResponseDto> {
    return this.getWeekSummary.execute({ userId, year: query.year, week: query.week });
  }

  @Get('day')
  @ApiOperation({ summary: 'Get income/expense summary for a given day (YYYY-MM-DD)' })
  getDay(
    @UserId() userId: string,
    @Query() query: DaySummaryDto,
  ): Promise<MonthSummaryResponseDto> {
    return this.getDaySummary.execute({ userId, date: query.date });
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Get multi-month income/expense comparison' })
  getComparison(
    @UserId() userId: string,
    @Query() query: ComparisonDto,
  ): Promise<MonthComparisonEntryDto[]> {
    return this.getMonthComparison.execute({ userId, months: query.months });
  }
}
