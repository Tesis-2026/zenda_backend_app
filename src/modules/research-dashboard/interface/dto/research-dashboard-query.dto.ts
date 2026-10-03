import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ResearchDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive start date. Use YYYY-MM-DD.',
    example: '2026-06-01',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end date. Use YYYY-MM-DD.',
    example: '2026-06-30',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description:
      'Optional research cohort code. Illustrative cohorts are excluded unless requested explicitly.',
    example: 'ILLUSTRATIVE_30',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  cohort?: string;

  @ApiPropertyOptional({
    description: 'Research dashboard access token. Prefer x-research-token for automation.',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  token?: string;
}
