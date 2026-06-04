import { NotificationEntity, NotificationKind } from '../notification.entity';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  data?: Record<string, string>;
  sentAt?: Date | null;
}

export interface FindRecentArgs {
  userId: string;
  limit: number;
  unreadOnly?: boolean;
}

export interface RecentTypeKeyArgs {
  userId: string;
  type: NotificationKind;
  // Idempotency window — we don't send the same notification twice within this period.
  // Used by cron jobs to avoid duplicate alerts.
  since: Date;
  // Optional data key/value to scope idempotency (e.g. budgetId, challengeId).
  dataKey?: string;
  dataValue?: string;
}

export abstract class INotificationRepository {
  abstract create(input: CreateNotificationInput): Promise<NotificationEntity>;
  abstract findRecent(args: FindRecentArgs): Promise<NotificationEntity[]>;
  abstract countUnread(userId: string): Promise<number>;
  abstract markRead(id: string, userId: string): Promise<NotificationEntity | null>;
  abstract markAllRead(userId: string): Promise<number>;
  abstract existsRecent(args: RecentTypeKeyArgs): Promise<boolean>;
}

export const NOTIFICATION_REPOSITORY = Symbol('INotificationRepository');
