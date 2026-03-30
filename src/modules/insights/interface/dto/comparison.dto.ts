import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ComparisonDto {
  @ApiProperty({ example: 3, minimum: 2, maximum: 12, description: 'Number of past months to compare' })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(12)
  months!: number;
}
