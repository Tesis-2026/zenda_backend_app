import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TopCategoryItemDto {
  @ApiProperty({ example: 'Alimentación' })
  name!: string;

  @ApiProperty({ example: 850.25 })
  amount!: number;
}

class GoalProgressItemDto {
  @ApiProperty({ example: 'Fondo de emergencia' })
  name!: string;

  @ApiProperty({ example: 300 })
  currentAmount!: number;

  @ApiProperty({ example: 5000 })
  targetAmount!: number;

  @ApiProperty({ example: 6 })
  progressPercent!: number;
}

export class MonthSummaryResponseDto {
  @ApiProperty({ example: 4200 })
  totalIncome!: number;

  @ApiProperty({ example: 1800.5 })
  totalExpense!: number;

  @ApiProperty({ example: 2399.5 })
  netBalance!: number;

  @ApiProperty({ type: () => [TopCategoryItemDto] })
  topCategories!: TopCategoryItemDto[];

  @ApiProperty({ type: () => [GoalProgressItemDto] })
  goalsProgress!: GoalProgressItemDto[];

  @ApiPropertyOptional({ type: () => [DailyBreakdownItemDto] })
  dailyBreakdown?: DailyBreakdownItemDto[];
}

class DailyBreakdownItemDto {
  @ApiProperty({ example: '2026-04-28' })
  date!: string;

  @ApiProperty({ example: 0 })
  totalIncome!: number;

  @ApiProperty({ example: 120.5 })
  totalExpense!: number;
}
