import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoalResponseDto {
  @ApiProperty({ example: '649fd64f-07b8-4530-938b-21823a4fcbfe' })
  id!: string;

  @ApiProperty({ example: '73ae7668-1c5f-4b7a-a16d-420a6a6a5b90' })
  userId!: string;

  @ApiProperty({ example: 'Fondo de emergencia' })
  name!: string;

  @ApiProperty({ example: 5000 })
  targetAmount!: number;

  @ApiProperty({ example: 300 })
  currentAmount!: number;

  @ApiProperty({ example: false, description: 'True when currentAmount >= targetAmount' })
  isCompleted!: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  dueDate?: string | null;

  @ApiProperty({ example: '2026-03-03T10:30:10.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-03T10:30:10.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: null })
  deletedAt?: string | null;
}
