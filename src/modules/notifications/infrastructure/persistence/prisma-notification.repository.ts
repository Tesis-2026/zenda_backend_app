import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { NotificationEntity, NotificationKind } from '../../domain/notification.entity';
import {
  CreateNotificationInput,
  FindRecentArgs,
  INotificationRepository,
  RecentTypeKeyArgs,
} from '../../domain/ports/notification.repository';

type NotificationRow = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Prisma.JsonValue | null;
  readAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
};

function toEntity(row: NotificationRow): NotificationEntity {
  let data: Record<string, string> | null = null;
  if (row.data !== null && typeof row.data === 'object' && !Array.isArray(row.data)) {
    const obj: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.data as Record<string, unknown>)) {
      if (typeof v === 'string') obj[k] = v;
    }
    data = obj;
  }
  return NotificationEntity.fromPersistence({
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationKind,
    title: row.title,
    body: row.body,
    data,
    readAt: row.readAt,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput): Promise<NotificationEntity> {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as NotificationType,
        title: input.title,
        body: input.body,
        data: input.data ? (input.data as Prisma.InputJsonValue) : Prisma.JsonNull,
        sentAt: input.sentAt ?? null,
      },
    });
    return toEntity(row);
  }

  async findRecent(args: FindRecentArgs): Promise<NotificationEntity[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId: args.userId,
        ...(args.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: args.limit,
    });
    return rows.map(toEntity);
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string): Promise<NotificationEntity | null> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const existing = await this.prisma.notification.findFirst({ where: { id, userId } });
      return existing ? toEntity(existing) : null;
    }
    const updated = await this.prisma.notification.findFirstOrThrow({ where: { id, userId } });
    return toEntity(updated);
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async existsRecent(args: RecentTypeKeyArgs): Promise<boolean> {
    const dataFilter: Prisma.NotificationWhereInput['data'] | undefined =
      args.dataKey !== undefined && args.dataValue !== undefined
        ? { path: [args.dataKey], equals: args.dataValue }
        : undefined;
    const count = await this.prisma.notification.count({
      where: {
        userId: args.userId,
        type: args.type as NotificationType,
        createdAt: { gte: args.since },
        ...(dataFilter ? { data: dataFilter } : {}),
      },
    });
    return count > 0;
  }
}
