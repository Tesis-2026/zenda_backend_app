import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { NotificationKind } from '../../domain/notification.entity';
import {
  EligibleQuery,
  EligibleUser,
  INotificationUserPort,
} from '../../domain/ports/notification-user.port';

type PrefsMap = Partial<Record<NotificationKind, boolean>>;

function parsePrefs(raw: Prisma.JsonValue | null | undefined): PrefsMap {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: PrefsMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean' && (Object.values(NotificationType) as string[]).includes(key)) {
      out[key as NotificationKind] = value;
    }
  }
  return out;
}

function isPrefEnabled(prefs: PrefsMap, type: NotificationKind): boolean {
  return prefs[type] ?? true;
}

@Injectable()
export class PrismaNotificationUserAdapter implements INotificationUserPort {
  constructor(private readonly prisma: PrismaService) {}

  async getFcmToken(userId: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    return row?.fcmToken ?? null;
  }

  async setFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
  }

  async clearFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  async setDailyReminderTime(userId: string, hhmm: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { dailyReminderAt: hhmm },
    });
  }

  async isEnabled(userId: string, type: NotificationKind): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    if (!row) return false;
    return isPrefEnabled(parsePrefs(row.notificationPrefs), type);
  }

  async listEligibleUsers(query: EligibleQuery): Promise<EligibleUser[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(query.userIds && query.userIds.length > 0 ? { id: { in: query.userIds } } : {}),
      },
      select: {
        id: true,
        fcmToken: true,
        dailyReminderAt: true,
        notificationPrefs: true,
      },
    });
    return rows
      .filter((r) => isPrefEnabled(parsePrefs(r.notificationPrefs), query.type))
      .map((r) => ({
        id: r.id,
        fcmToken: r.fcmToken,
        dailyReminderAt: r.dailyReminderAt,
      }));
  }
}
