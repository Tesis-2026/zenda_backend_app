import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../domain/transaction-type.enum';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiPropertyOptional({
    description: 'Category UUID from system categories or user custom categories',
    example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Create and use a custom category for this transaction (cannot be sent with categoryId)',
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

  @ApiProperty({ example: 'Supermarket purchase', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type!: TransactionType;

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
