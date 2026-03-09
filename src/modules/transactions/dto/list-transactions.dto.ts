import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsUUID } from 'class-validator';
import { TRANSACTION_TYPES } from './create-transaction.dto';

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

  @ApiPropertyOptional({ enum: TRANSACTION_TYPES, example: 'expense' })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: (typeof TRANSACTION_TYPES)[number];

  @ApiPropertyOptional({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
