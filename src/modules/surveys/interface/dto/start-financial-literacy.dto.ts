import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class StartFinancialLiteracyDto {
  @ApiProperty({ description: 'Whether the participant accepted informed academic consent' })
  @IsBoolean()
  consentGiven!: boolean;

  @ApiProperty({ description: 'Version of the informed consent', example: 'FINLIT_CONSENT_V1' })
  @IsString()
  @IsNotEmpty()
  consentVersion!: string;
}
