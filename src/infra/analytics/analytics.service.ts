import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(
    userId: string,
    eventType: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.trackAsync(userId, eventType, metadata).catch(() => undefined);
  }

  async trackAsync(
    userId: string,
    eventType: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: { userId, eventType, metadata: (metadata ?? {}) as object },
    });
  }
}
