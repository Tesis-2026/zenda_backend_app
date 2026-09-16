import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { safeTelemetryMetadata } from './telemetry-policy';

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { consentGiven: true, deletedAt: true },
    });
    if (!user?.consentGiven || user.deletedAt) return;
    await this.prisma.analyticsEvent.create({
      data: { userId, eventType, metadata: safeTelemetryMetadata(metadata) },
    });
  }
}
