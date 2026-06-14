import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  ALL_NOTIFICATION_TYPES,
  NotificationPreference,
  buildPreferenceList,
} from '../../domain/notification-preference';
import { NotificationType } from '../../domain/notification-type.enum';
import { INotificationPreferenceRepository } from '../../domain/ports/notification-preference.repository';

type PrefsMap = Partial<Record<NotificationType, boolean>>;

function parsePrefs(raw: Prisma.JsonValue | null | undefined): PrefsMap {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PrefsMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean' && (ALL_NOTIFICATION_TYPES as readonly string[]).includes(key)) {
      out[key as NotificationType] = value;
    }
  }
  return out;
}

@Injectable()
export class PrismaNotificationPreferenceRepository implements INotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<NotificationPreference[]> {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    return buildPreferenceList(parsePrefs(row.notificationPrefs));
  }

  async setForUser(userId: string, type: NotificationType, enabled: boolean): Promise<void> {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const prefs = parsePrefs(row.notificationPrefs);
    prefs[type] = enabled;
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: prefs as Prisma.InputJsonValue },
    });
  }
}
