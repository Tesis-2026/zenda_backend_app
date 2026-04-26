import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class FeedbackDto {
  @ApiProperty({ description: 'true = helpful, false = not relevant' })
  @IsBoolean()
  accepted!: boolean;
}
