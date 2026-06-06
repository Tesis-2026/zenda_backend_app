import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiPropertyOptional({ description: 'Category ID (null = global budget for all categories)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Budget name (pot label)', example: 'Alquiler' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @ApiProperty({ description: 'Spending limit in PEN', example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountLimit!: number;

  @ApiProperty({ description: 'Month (1–12)', example: 3 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Year', example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(3000)
  year!: number;
}
