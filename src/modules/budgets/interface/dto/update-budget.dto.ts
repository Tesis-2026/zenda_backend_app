import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateBudgetDto {
  @ApiPropertyOptional({ description: 'New spending limit in PEN', example: 600 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountLimit?: number;

  @ApiPropertyOptional({ description: 'New budget name (pot label)', example: 'Alquiler' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;
}
