import { NotificationKind } from '../notification.entity';

export interface EligibleUser {
  id: string;
  fcmToken: string | null;
  dailyReminderAt: string | null;
}

export interface EligibleQuery {
  type: NotificationKind;
  // Only users with these IDs (empty/undefined = all users with prefs allowing the type).
  userIds?: string[];
}

export abstract class INotificationUserPort {
  abstract getFcmToken(userId: string): Promise<string | null>;
  abstract setFcmToken(userId: string, token: string): Promise<void>;
  abstract clearFcmToken(userId: string): Promise<void>;
  abstract setDailyReminderTime(userId: string, hhmm: string | null): Promise<void>;

  /**
   * Returns true when the user has the given notification type enabled.
   * Missing keys default to true (opt-out semantics matches existing prefs UI).
   */
  abstract isEnabled(userId: string, type: NotificationKind): Promise<boolean>;

  /**
   * Cron query: returns active (non-deleted) users who have the given type
   * enabled. Used by NotificationsScheduleService to fan out reminders.
   */
  abstract listEligibleUsers(query: EligibleQuery): Promise<EligibleUser[]>;
}

export const NOTIFICATION_USER_PORT = Symbol('INotificationUserPort');
