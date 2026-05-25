import { ApiProperty } from '@nestjs/swagger';

export class PredictionAccuracyResponseDto {
  @ApiProperty({ description: 'Period the comparison is for, format YYYY-MM' })
  period!: string;

  @ApiProperty({ description: 'Total expense the AI predicted for the period' })
  predictedTotal!: number;

  @ApiProperty({ description: 'Actual expense recorded for the period' })
  actualTotal!: number;

  @ApiProperty({
    nullable: true,
    description:
      'Accuracy in percent, capped at 2 decimals. Null when actualTotal is 0 (no meaningful denominator).',
  })
  accuracyPct!: number | null;
}
