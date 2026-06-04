import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { SendNotificationUseCase } from '../../../notifications/application/use-cases/send-notification.use-case';
import { BadgeEntity } from '../../domain/badge.entity';
import { IBadgeRepository } from '../../domain/ports/badge.repository';

@Injectable()
export class PrismaBadgeRepository implements IBadgeRepository {
  private readonly logger = new Logger(PrismaBadgeRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    // Pragmatic cross-layer DI: infrastructure repository calls an application
    // use case to dispatch the BADGE_EARNED notification when a new badge is
    // granted. Keeps all 8 existing call-sites untouched. The alternative
    // (caller-side notification) would require updating every awardIfNotEarned
    // consumer. Documented exception to the DDD inward-pointing rule.
    private readonly notifications: SendNotificationUseCase,
  ) {}

  async list(userId: string): Promise<BadgeEntity[]> {
    const badges = await this.prisma.badge.findMany({ orderBy: { name: 'asc' } });
    const userBadges = await this.prisma.userBadge.findMany({ where: { userId } });
    const earned = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

    return badges.map(
      (b) =>
        new BadgeEntity(b.id, b.name, b.description, b.criteria, b.iconUrl, earned.has(b.id), earned.get(b.id) ?? null),
    );
  }

  async awardIfNotEarned(userId: string, badgeName: string): Promise<void> {
    const badge = await this.prisma.badge.findUnique({ where: { name: badgeName } });
    if (!badge) return;
    const existing = await this.prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } });
    if (existing) return;
    await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });

    // Fire-and-forget the BADGE_EARNED notification. Any failure here must
    // not roll back the badge grant — log and swallow.
    this.notifications
      .execute({
        userId,
        type: 'BADGE_EARNED',
        title: '¡Nuevo logro desbloqueado!',
        body: `Ganaste el logro "${badge.name}": ${badge.description}`,
        data: { badgeId: badge.id, badgeName: badge.name },
      })
      .catch((err) => this.logger.warn(`BADGE_EARNED notification failed for ${userId}/${badgeName}: ${String(err)}`));
  }
}
