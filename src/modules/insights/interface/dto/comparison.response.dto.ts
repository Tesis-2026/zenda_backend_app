import { ApiProperty } from '@nestjs/swagger';

export class MonthComparisonEntryDto {
  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 3 })
  month!: number;

  @ApiProperty({ example: 4200 })
  totalIncome!: number;

  @ApiProperty({ example: 1800.5 })
  totalExpense!: number;

  @ApiProperty({ example: 2399.5 })
  netBalance!: number;
}
