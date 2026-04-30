import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(userId: string, eventType: string, metadata?: Record<string, unknown>): void {
    this.prisma.analyticsEvent
      .create({ data: { userId, eventType, metadata: (metadata ?? {}) as object } })
      .catch(() => undefined);
  }
}
