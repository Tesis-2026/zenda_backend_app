import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SendNotificationUseCase } from '../application/use-cases/send-notification.use-case';
import {
  INotificationUserPort,
  NOTIFICATION_USER_PORT,
} from '../domain/ports/notification-user.port';

// Default time-of-day when a user has not set `dailyReminderAt`.
// Stored and compared as HH:mm in the server's local timezone.
const DEFAULT_DAILY_REMINDER_AT = '21:30';

// Reads either `durationDays` or `periodDays` from a Challenge.criteriaJson
// payload (B36 derivation rule). Returns null when neither is a positive number.
function extractChallengeDays(criteria: unknown): number | null {
  if (criteria === null || typeof criteria !== 'object') return null;
  const obj = criteria as Record<string, unknown>;
  const candidates = [obj.durationDays, obj.periodDays];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

@Injectable()
export class NotificationsScheduleService {
  private readonly logger = new Logger(NotificationsScheduleService.name);

  constructor(
    private readonly send: SendNotificationUseCase,
    @Inject(NOTIFICATION_USER_PORT)
    private readonly userPort: INotificationUserPort,
    // Pragmatic: cron queries cross several aggregates (transactions,
    // challenges, predictions). Wrapping each in a port would triple the
    // surface area for ~30 lines of query. Documented exception.
    private readonly prisma: PrismaService,
  ) {}

  // ── DAILY_REMINDER ─────────────────────────────────────────────────────────
  // Runs every minute. Each invocation finds users whose `dailyReminderAt`
  // matches the current HH:mm (or default 21:30 when unset) AND have not
  // recorded a transaction today, then sends one reminder.
  @Cron(CronExpression.EVERY_MINUTE)
  async runDailyReminder(): Promise<void> {
    const now = new Date();
    const currentTimeStr =
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0');

    const eligible = await this.userPort.listEligibleUsers({ type: 'DAILY_REMINDER' });

    const targetUsers = eligible.filter((u) => {
      return (u.dailyReminderAt ?? DEFAULT_DAILY_REMINDER_AT) === currentTimeStr;
    });

    if (targetUsers.length === 0) return;

    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sinceWindow = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    let sent = 0;
    for (const user of targetUsers) {
      const hasTxToday = await this.prisma.transaction.count({
        where: {
          userId: user.id,
          deletedAt: null,
          occurredAt: { gte: dayStart },
        },
      });
      if (hasTxToday > 0) continue;

      const result = await this.send.execute({
        userId: user.id,
        type: 'DAILY_REMINDER',
        title: 'Recuerda registrar tus gastos',
        body: 'Anota lo que gastaste hoy para mantener tu racha y tu control financiero.',
        idempotencySince: sinceWindow,
      });
      if (result.notification) sent++;
    }
    this.logger.log(`DAILY_REMINDER: scanned=${targetUsers.length} sent=${sent}`);
  }

  // ── CHALLENGE_REMINDER ─────────────────────────────────────────────────────
  // Daily at 09:00: notify users whose ACTIVE challenges expire within 48h.
  // Status is derived from (acceptedAt, completedAt); expiry is derived from
  // acceptedAt + criteriaJson.durationDays|periodDays (no persisted column).
  // One reminder per challenge per 24h.
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runChallengeReminder(): Promise<void> {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const active = await this.prisma.userChallenge.findMany({
      where: {
        acceptedAt: { not: null },
        completedAt: null,
      },
      select: {
        userId: true,
        challengeId: true,
        acceptedAt: true,
        challenge: { select: { title: true, criteriaJson: true } },
      },
      take: 500,
    });

    if (active.length === 0) return;

    let sent = 0;
    for (const uc of active) {
      const days = extractChallengeDays(uc.challenge.criteriaJson);
      if (days === null || uc.acceptedAt === null) continue;

      const expiresAt = new Date(uc.acceptedAt.getTime() + days * 24 * 60 * 60 * 1000);
      if (expiresAt <= now || expiresAt > in48h) continue;

      const enabled = await this.userPort.isEnabled(uc.userId, 'CHALLENGE_REMINDER');
      if (!enabled) continue;

      const hoursLeft = Math.max(
        1,
        Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000)),
      );

      const result = await this.send.execute({
        userId: uc.userId,
        type: 'CHALLENGE_REMINDER',
        title: 'Tu reto vence pronto',
        body: `"${uc.challenge.title}" vence en ~${hoursLeft}h. ¡No lo dejes pasar!`,
        data: { challengeId: uc.challengeId },
        idempotencySince: since24h,
        idempotencyDataKey: 'challengeId',
        idempotencyDataValue: uc.challengeId,
        respectPreferences: false,
      });
      if (result.notification) sent++;
    }
    this.logger.log(`CHALLENGE_REMINDER: scanned=${active.length} sent=${sent}`);
  }

  // ── PREDICTION_READY ───────────────────────────────────────────────────────
  // 1st of every month at 09:00: for users with PREDICTION_READY enabled and
  // ≥2 months of expense history, notify that a fresh prediction is available.
  @Cron('0 9 1 * *')
  async runPredictionReady(): Promise<void> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const eligible = await this.userPort.listEligibleUsers({ type: 'PREDICTION_READY' });
    if (eligible.length === 0) return;

    let sent = 0;
    for (const user of eligible) {
      const totalExpensesPrior = await this.prisma.transaction.count({
        where: {
          userId: user.id,
          type: TransactionType.EXPENSE,
          deletedAt: null,
          occurredAt: { lt: monthStart },
        },
      });
      if (totalExpensesPrior < 10) continue; // proxy for "≥2 months history"

      const result = await this.send.execute({
        userId: user.id,
        type: 'PREDICTION_READY',
        title: 'Tu predicción del mes está lista',
        body: 'Revisa tus gastos estimados y prepara tu presupuesto para este mes.',
        idempotencySince: monthStart,
        respectPreferences: false,
      });
      if (result.notification) sent++;
    }
    this.logger.log(`PREDICTION_READY: scanned=${eligible.length} sent=${sent}`);
  }
}
