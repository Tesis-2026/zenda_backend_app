import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
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
    private readonly prisma: PrismaService,
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

  @Get('progress')
  @ApiOperation({ summary: 'Get current vs previous month financial progress (US-0407)' })
  async getProgress(@UserId() userId: string): Promise<object> {
    const now = new Date();
    const [curFrom, curTo, prevFrom, prevTo] = [
      new Date(now.getFullYear(), now.getMonth(), 1),
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
      new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    ];

    const agg = async (from: Date, to: Date, type: TransactionType) =>
      this.prisma.transaction
        .aggregate({ where: { userId, type, occurredAt: { gte: from, lte: to }, deletedAt: null }, _sum: { amount: true } })
        .then((r) => (r._sum.amount ?? new Decimal(0)).toNumber());

    const [curIncome, curExpenses, prevIncome, prevExpenses] = await Promise.all([
      agg(curFrom, curTo, TransactionType.INCOME),
      agg(curFrom, curTo, TransactionType.EXPENSE),
      agg(prevFrom, prevTo, TransactionType.INCOME),
      agg(prevFrom, prevTo, TransactionType.EXPENSE),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? null : Number(((cur - prev) / prev * 100).toFixed(2));

    return {
      currentMonth: { income: curIncome, expenses: curExpenses, balance: curIncome - curExpenses, savings: Math.max(0, curIncome - curExpenses) },
      previousMonth: { income: prevIncome, expenses: prevExpenses, balance: prevIncome - prevExpenses, savings: Math.max(0, prevIncome - prevExpenses) },
      changes: {
        expensesChangePercent: pct(curExpenses, prevExpenses),
        savingsChangePercent: pct(Math.max(0, curIncome - curExpenses), Math.max(0, prevIncome - prevExpenses)),
        balanceChangePercent: pct(curIncome - curExpenses, prevIncome - prevExpenses),
      },
    };
  }
}
