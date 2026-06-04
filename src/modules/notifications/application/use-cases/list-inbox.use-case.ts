import { Inject, Injectable } from '@nestjs/common';
import { NotificationEntity } from '../../domain/notification.entity';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/ports/notification.repository';

export interface ListInboxResult {
  items: NotificationEntity[];
  unreadCount: number;
}

@Injectable()
export class ListInboxUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(userId: string, limit = 50, unreadOnly = false): Promise<ListInboxResult> {
    const [items, unreadCount] = await Promise.all([
      this.repo.findRecent({ userId, limit, unreadOnly }),
      this.repo.countUnread(userId),
    ]);
    return { items, unreadCount };
  }
}
