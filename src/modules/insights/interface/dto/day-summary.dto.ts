import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class DaySummaryDto {
  @ApiProperty({ example: '2026-03-30', description: 'Date in YYYY-MM-DD format' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'date must be a valid date in YYYY-MM-DD format',
  })
  date!: string;
}
