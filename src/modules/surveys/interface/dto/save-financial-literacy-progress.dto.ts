import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SaveFinancialLiteracyProgressDto {
  @ApiProperty({ description: 'Map of questionId → selectedOption (A, B, C, D)' })
  @IsObject()
  answers!: Record<string, string>;
}
