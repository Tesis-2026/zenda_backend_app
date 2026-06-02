import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { BadgesFacade } from '../../../badges/application/facades/badges.facade';
import { ChallengeEntity, deriveChallengeStatus, extractDurationDays } from '../../domain/challenge.entity';
import { IChallengeRepository } from '../../domain/ports/challenge.repository';

@Injectable()
export class PrismaChallengeRepository implements IChallengeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badges: BadgesFacade,
  ) {}

  async list(userId: string): Promise<ChallengeEntity[]> {
    const challenges = await this.prisma.challenge.findMany({ orderBy: { createdAt: 'asc' } });
    const userChallenges = await this.prisma.userChallenge.findMany({ where: { userId } });
    const ucMap = new Map(userChallenges.map((uc) => [uc.challengeId, uc]));

    return challenges.map((c) => {
      const uc = ucMap.get(c.id) ?? null;
      const durationDays = extractDurationDays(c.criteriaJson);
      const status = deriveChallengeStatus(uc, durationDays);
      const expiresAt = uc?.acceptedAt && durationDays
        ? new Date(uc.acceptedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
        : null;
      return new ChallengeEntity(
        c.id, c.title, c.description, c.reward,
        status,
        uc?.acceptedAt ?? null,
        uc?.completedAt ?? null,
        expiresAt,
      );
    });
  }

  async accept(challengeId: string, userId: string): Promise<ChallengeEntity> {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const uc = await this.prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId, acceptedAt: new Date() },
      update: { acceptedAt: new Date() },
    });

    const durationDays = extractDurationDays(challenge.criteriaJson);
    const expiresAt = uc.acceptedAt && durationDays
      ? new Date(uc.acceptedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    return new ChallengeEntity(
      challenge.id, challenge.title, challenge.description, challenge.reward,
      deriveChallengeStatus(uc, durationDays),
      uc.acceptedAt, uc.completedAt, expiresAt,
    );
  }

  async complete(challengeId: string, userId: string): Promise<ChallengeEntity> {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const now = new Date();
    const uc = await this.prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      // If a user completes a challenge without explicitly accepting it (e.g., auto-verified),
      // record acceptedAt = completedAt so the state machine stays consistent.
      create: { userId, challengeId, acceptedAt: now, completedAt: now },
      update: { completedAt: now },
    });

    const completedCount = await this.prisma.userChallenge.count({
      where: { userId, completedAt: { not: null } },
    });
    if (completedCount >= 5) {
      await this.badges.awardIfNotEarned(userId, 'Challenger');
    }

    const durationDays = extractDurationDays(challenge.criteriaJson);
    const expiresAt = uc.acceptedAt && durationDays
      ? new Date(uc.acceptedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    return new ChallengeEntity(
      challenge.id, challenge.title, challenge.description, challenge.reward,
      deriveChallengeStatus(uc, durationDays, now),
      uc.acceptedAt, uc.completedAt, expiresAt,
    );
  }
}
