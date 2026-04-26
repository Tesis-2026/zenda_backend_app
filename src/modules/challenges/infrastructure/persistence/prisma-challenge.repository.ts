import { Injectable, NotFoundException } from '@nestjs/common';
import { UserChallengeStatus } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { ChallengeEntity } from '../../domain/challenge.entity';
import { IChallengeRepository } from '../../domain/ports/challenge.repository';

@Injectable()
export class PrismaChallengeRepository implements IChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ChallengeEntity[]> {
    const challenges = await this.prisma.challenge.findMany({ orderBy: { createdAt: 'asc' } });
    const userChallenges = await this.prisma.userChallenge.findMany({ where: { userId } });
    const ucMap = new Map(userChallenges.map((uc) => [uc.challengeId, uc]));

    return challenges.map((c) => {
      const uc = ucMap.get(c.id);
      return new ChallengeEntity(
        c.id, c.title, c.description, c.reward,
        (uc?.status ?? 'AVAILABLE') as ChallengeEntity['status'],
        uc?.acceptedAt ?? null,
        uc?.completedAt ?? null,
      );
    });
  }

  async accept(challengeId: string, userId: string): Promise<ChallengeEntity> {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const uc = await this.prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId, status: UserChallengeStatus.ACTIVE, acceptedAt: new Date() },
      update: { status: UserChallengeStatus.ACTIVE, acceptedAt: new Date() },
    });

    return new ChallengeEntity(
      challenge.id, challenge.title, challenge.description, challenge.reward,
      uc.status as ChallengeEntity['status'],
      uc.acceptedAt, uc.completedAt,
    );
  }
}
