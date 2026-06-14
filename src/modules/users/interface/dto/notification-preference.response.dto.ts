import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../domain/notification-type.enum';

export class NotificationPreferenceResponseDto {
  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  enabled!: boolean;
}
