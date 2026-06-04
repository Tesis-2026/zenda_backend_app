import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { NotificationEntity } from '../../domain/notification.entity';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ type: Object, nullable: true })
  data!: Record<string, string> | null;

  @ApiProperty({ nullable: true })
  readAt!: string | null;

  @ApiProperty({ nullable: true })
  sentAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  static from(entity: NotificationEntity): NotificationResponseDto {
    return {
      id: entity.id,
      type: entity.type as NotificationType,
      title: entity.title,
      body: entity.body,
      data: entity.data,
      readAt: entity.readAt?.toISOString() ?? null,
      sentAt: entity.sentAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}

export class NotificationInboxResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty()
  unreadCount!: number;
}
