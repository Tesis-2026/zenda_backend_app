import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

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
      'Research dashboard access token. Prefer x-research-token for automation.',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  token?: string;
}
