import { NotificationType } from '@prisma/client';
import { NotificationPreference } from '../notification-preference';

export abstract class INotificationPreferenceRepository {
  abstract listForUser(userId: string): Promise<NotificationPreference[]>;
  abstract setForUser(
    userId: string,
    type: NotificationType,
    enabled: boolean,
  ): Promise<void>;
}
