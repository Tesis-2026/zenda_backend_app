import { ApiProperty } from '@nestjs/swagger';

export class FinancialProgressResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: '2026-05' })
  period!: string;

  @ApiProperty({ nullable: true, example: 87.5 })
  budgetComplianceScore!: number | null;

  @ApiProperty({ nullable: true, example: 18.3 })
  savingsRatePct!: number | null;

  @ApiProperty({ example: 2 })
  overspendCategoriesCount!: number;

  @ApiProperty({ example: 12 })
  recommendationsShown!: number;

  @ApiProperty({ example: 5 })
  recommendationsAccepted!: number;

  @ApiProperty({ nullable: true, example: 41.7 })
  recommendationAcceptanceRate!: number | null;

  @ApiProperty({ example: 4 })
  quizzesCompleted!: number;

  @ApiProperty({ nullable: true, example: 82.0 })
  avgQuizScore!: number | null;

  @ApiProperty()
  createdAt!: string;
}
