import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePreferenceDto {
  @ApiProperty({ description: 'Enable or disable this notification type' })
  @IsBoolean()
  enabled!: boolean;
}
