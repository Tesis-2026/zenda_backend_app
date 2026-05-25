import { ApiProperty } from '@nestjs/swagger';

export class FeedbackCreatedResponseDto {
  @ApiProperty({ description: 'UUID of the newly created feedback record' })
  id!: string;
}
