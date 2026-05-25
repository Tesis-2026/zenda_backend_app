import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class ListProgressDto {
  @ApiPropertyOptional({ example: '2026-01', description: 'Inclusive start period (YYYY-MM)' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'from must match YYYY-MM' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-12', description: 'Inclusive end period (YYYY-MM)' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'to must match YYYY-MM' })
  to?: string;
}
