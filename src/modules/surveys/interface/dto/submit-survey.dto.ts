import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class SubmitSurveyDto {
  @ApiProperty({ description: 'Map of questionId → selected answer option (string)' })
  @IsObject()
  answers!: Record<string, string>;
}
