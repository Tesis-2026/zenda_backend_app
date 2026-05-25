import { ApiProperty } from '@nestjs/swagger';

export class RecommendationStatsResponseDto {
  @ApiProperty({ description: 'Total number of recommendations the user has received' })
  total!: number;

  @ApiProperty({ description: 'Subset of `total` that the user accepted via the feedback endpoint' })
  accepted!: number;

  @ApiProperty({
    description: 'accepted / total, rounded to 4 decimal places. 0 when total is 0.',
    minimum: 0,
    maximum: 1,
  })
  acceptanceRate!: number;
}
