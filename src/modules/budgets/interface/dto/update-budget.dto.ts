import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdateBudgetDto {
  @ApiProperty({ description: 'New spending limit in PEN', example: 600 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountLimit!: number;
}
