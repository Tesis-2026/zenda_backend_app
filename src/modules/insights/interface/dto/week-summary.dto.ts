import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class WeekSummaryDto {
  @ApiProperty({ example: 2026, minimum: 2000, maximum: 3000 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(3000)
  year!: number;

  @ApiProperty({ example: 13, minimum: 1, maximum: 53, description: 'ISO week number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week!: number;
}
