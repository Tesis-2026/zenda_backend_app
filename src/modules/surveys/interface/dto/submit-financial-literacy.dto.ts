import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitFinancialLiteracyDto {
  @ApiProperty({ description: 'Map of questionId → selectedOption (A, B, C, D)' })
  @IsObject()
  answers!: Record<string, string>;

  @ApiPropertyOptional({ description: 'Optional consent acceptance flag' })
  @IsOptional()
  @IsBoolean()
  consentGiven?: boolean;

  @ApiPropertyOptional({ description: 'Optional consent version string' })
  @IsOptional()
  @IsString()
  consentVersion?: string;
}
