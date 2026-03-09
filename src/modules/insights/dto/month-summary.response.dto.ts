import { ApiProperty } from '@nestjs/swagger';

class TopCategoryItemDto {
  @ApiProperty({ example: 'Alimentación' })
  categoryName!: string;

  @ApiProperty({ example: 850.25 })
  totalExpense!: number;
}

class GoalProgressItemDto {
  @ApiProperty({ example: 'Fondo de emergencia' })
  goalName!: string;

  @ApiProperty({ example: 300 })
  currentAmount!: number;

  @ApiProperty({ example: 5000 })
  targetAmount!: number;

  @ApiProperty({ example: 6 })
  percent!: number;
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
}