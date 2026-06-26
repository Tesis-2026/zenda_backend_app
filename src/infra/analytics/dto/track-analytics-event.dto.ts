import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class TrackAnalyticsEventDto {
  @ApiProperty({
    example: 'screen_view',
    description: 'Stable snake_case event name emitted by the mobile app.',
  })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9_]{1,79}$/)
  eventType!: string;

  @ApiPropertyOptional({
    example: { screen: 'dashboard', source: 'study_prompt' },
    description: 'Small JSON payload with non-sensitive context.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
