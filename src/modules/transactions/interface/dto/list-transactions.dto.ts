import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListTransactionsDto {
  @ApiPropertyOptional({
    description: 'Start date filter (inclusive)',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description: 'End date filter (inclusive)',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
