import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { BadgeEntity } from '../../domain/badge.entity';
import { IBadgeRepository } from '../../domain/ports/badge.repository';

@Injectable()
export class PrismaBadgeRepository implements IBadgeRepository {
  constructor(private readonly prisma: PrismaService) {}

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
  }
}
