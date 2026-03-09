import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  id!: string;

  @ApiProperty({ example: 'Alimentación' })
  name!: string;

  @ApiProperty({ enum: ['SYSTEM', 'CUSTOM'], example: 'SYSTEM' })
  type!: 'SYSTEM' | 'CUSTOM';

  @ApiPropertyOptional({ example: '73ae7668-1c5f-4b7a-a16d-420a6a6a5b90', nullable: true })
  userId?: string | null;

  @ApiProperty({ example: '2026-03-03T14:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-03T14:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: null })
  deletedAt?: string | null;
}
