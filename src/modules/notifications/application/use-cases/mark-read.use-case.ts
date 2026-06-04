import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationEntity } from '../../domain/notification.entity';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/ports/notification.repository';

@Injectable()
export class MarkReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(id: string, userId: string): Promise<NotificationEntity> {
    const result = await this.repo.markRead(id, userId);
    if (!result) {
      throw new NotFoundException('Notification not found');
    }
    return result;
  }

  async markAll(userId: string): Promise<number> {
    return this.repo.markAllRead(userId);
  }
}
