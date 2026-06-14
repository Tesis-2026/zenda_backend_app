import { NotificationType } from './notification-type.enum';

/**
 * A user's opt-in/out for one notification type.
 *
 * Stored in the DB as a single JSON column on User (`notificationPrefs`),
 * but the domain treats it as a list of (type, enabled) pairs so callers
 * never have to deal with the JSON shape. Missing keys default to
 * `enabled: true` — opt-out semantics preserved from the pre-DDD table.
 */
export interface NotificationPreference {
  readonly type: NotificationType;
  readonly enabled: boolean;
}

export const ALL_NOTIFICATION_TYPES: readonly NotificationType[] = Object.values(NotificationType);

/**
 * Folds a partial `{ type: enabled }` map into the full list of
 * preferences, applying the "missing = enabled" default.
 */
export function buildPreferenceList(
  prefs: Partial<Record<NotificationType, boolean>>,
): NotificationPreference[] {
  return ALL_NOTIFICATION_TYPES.map((type) => ({
    type,
    enabled: prefs[type] ?? true,
  }));
}

/**
 * Type guard for the path-param string. Used in the controller to reject
 * unknown notification types with a 400 before the use case runs.
 */
export function isNotificationType(value: string): value is NotificationType {
  return (ALL_NOTIFICATION_TYPES as readonly string[]).includes(value);
}
