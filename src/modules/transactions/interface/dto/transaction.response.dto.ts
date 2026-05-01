import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TransactionCategoryDto {
  @ApiProperty({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  id!: string;

  @ApiProperty({ example: 'Alimentación' })
  name!: string;
}

export class TransactionResponseDto {
  @ApiProperty({ example: '0403f4f8-f5e0-4f9b-b9e8-36c33320e8be' })
  id!: string;

  @ApiProperty({ example: '73ae7668-1c5f-4b7a-a16d-420a6a6a5b90' })
  userId!: string;

  @ApiPropertyOptional({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  categoryId?: string | null;

  @ApiProperty({ enum: ['expense', 'income'], example: 'expense' })
  type!: 'expense' | 'income';

  @ApiProperty({ example: 'PEN' })
  currency!: string;

  @ApiProperty({ example: 120.5 })
  amount!: number;

  @ApiProperty({ example: 'Compra supermercado' })
  description!: string;

  @ApiProperty({ example: '2026-03-03T10:30:00.000Z' })
  occurredAt!: string;

  @ApiProperty({ example: '2026-03-03T10:30:10.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-03T10:30:10.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: null })
  deletedAt?: string | null;

  @ApiPropertyOptional({ type: () => TransactionCategoryDto })
  category?: TransactionCategoryDto | null;

  @ApiPropertyOptional({ type: [String], example: ['Daily Habit Challenge'] })
  newlyCompletedChallenges?: string[];
}
