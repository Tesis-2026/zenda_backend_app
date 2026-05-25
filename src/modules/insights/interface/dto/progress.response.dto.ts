import { ApiProperty } from '@nestjs/swagger';

class MonthTotalsDto {
  @ApiProperty() income!: number;
  @ApiProperty() expenses!: number;
  @ApiProperty({ description: 'income - expenses (can be negative)' }) balance!: number;
  @ApiProperty({ description: 'max(0, income - expenses)' }) savings!: number;
}

class ChangesDto {
  @ApiProperty({
    nullable: true,
    description:
      'Percent change in expenses vs the previous month. Null when previous-month value is 0.',
  })
  expensesChangePercent!: number | null;

  @ApiProperty({ nullable: true })
  savingsChangePercent!: number | null;

  @ApiProperty({ nullable: true })
  balanceChangePercent!: number | null;
}

export class ProgressResponseDto {
  @ApiProperty({ type: MonthTotalsDto }) currentMonth!: MonthTotalsDto;
  @ApiProperty({ type: MonthTotalsDto }) previousMonth!: MonthTotalsDto;
  @ApiProperty({ type: ChangesDto }) changes!: ChangesDto;
}
