import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { IChallengeRepository } from './domain/ports/challenge.repository';
import { IChallengeVerificationPort } from './domain/ports/challenge-verification.port';
import { PrismaChallengeRepository } from './infrastructure/persistence/prisma-challenge.repository';
import { PrismaChallengeVerificationRepository } from './infrastructure/persistence/prisma-challenge-verification.repository';
import { VerifyChallengesUseCase } from './application/use-cases/verify-challenges.use-case';
import { ChallengesController } from './interface/challenges.controller';

@Module({
  imports: [PrismaModule, BadgesModule],
  controllers: [ChallengesController],
  providers: [
    { provide: IChallengeRepository, useClass: PrismaChallengeRepository },
    {
      provide: IChallengeVerificationPort,
      useClass: PrismaChallengeVerificationRepository,
    },
    VerifyChallengesUseCase,
  ],
  exports: [IChallengeRepository, VerifyChallengesUseCase],
})
export class ChallengesModule {}
