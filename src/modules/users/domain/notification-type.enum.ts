/**
 * Domain enum for notification types. Declared here (not imported from
 * `@prisma/client`) so the domain layer stays free of ORM coupling — per the
 * project rule "Domain enums live in `domain/` — never imported from
 * `@prisma/client`".
 *
 * The string values are kept identical to the Prisma `NotificationType` enum
 * so they serialize 1:1. Preferences persist in the `users.notificationPrefs`
 * JSON column (untyped at the DB boundary), so no Prisma↔domain cast is needed
 * — the matching string values are the mapping.
 */
export enum NotificationType {
  TRANSACTION_RECORDED = 'TRANSACTION_RECORDED',
  BUDGET_ALERT = 'BUDGET_ALERT',
  ANOMALY_ALERT = 'ANOMALY_ALERT',
  PREDICTION_READY = 'PREDICTION_READY',
  CHALLENGE_REMINDER = 'CHALLENGE_REMINDER',
  DAILY_REMINDER = 'DAILY_REMINDER',
  BADGE_EARNED = 'BADGE_EARNED',
}
