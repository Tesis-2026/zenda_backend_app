import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export const TRANSACTION_TYPES = ['expense', 'income'] as const;

export class CreateTransactionDto {
  @ApiPropertyOptional({
    description: 'Category UUID from system categories or user custom categories',
    example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Create and use a custom category for this transaction (cannot be sent with categoryId)',
    example: 'Veterinaria',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  newCategoryName?: string;

  @ApiProperty({ example: 120.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'Compra supermercado' })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiProperty({ enum: TRANSACTION_TYPES, example: 'expense' })
  @IsIn(TRANSACTION_TYPES)
  type!: (typeof TRANSACTION_TYPES)[number];

  @ApiPropertyOptional({ example: 'PEN', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 datetime, must not be in the future',
    example: '2026-03-03T10:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
