import { ApiProperty } from '@nestjs/swagger';

export class GoalContributionResponseDto {
  @ApiProperty({ example: '649fd64f-07b8-4530-938b-21823a4fcbfe' })
  id!: string;

  @ApiProperty({ example: '73ae7668-1c5f-4b7a-a16d-420a6a6a5b90' })
  goalId!: string;

  @ApiProperty({ example: 150.0 })
  amount!: number;

  @ApiProperty({ example: '2026-03-30T12:00:00.000Z' })
  createdAt!: string;
}
