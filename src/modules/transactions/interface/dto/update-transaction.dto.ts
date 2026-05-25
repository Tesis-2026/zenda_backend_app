import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength, Min } from 'class-validator';
import { TransactionType } from '../../domain/transaction-type.enum';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Veterinaria', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  newCategoryName?: string;

  @ApiPropertyOptional({ example: 95.0, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 'Updated note', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 'PEN', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-03-03T10:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
