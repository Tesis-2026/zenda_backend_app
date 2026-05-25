import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { IChallengeRepository } from './domain/ports/challenge.repository';
import { IChallengeVerificationPort } from './domain/ports/challenge-verification.port';
import { PrismaChallengeRepository } from './infrastructure/persistence/prisma-challenge.repository';
import { PrismaChallengeVerificationRepository } from './infrastructure/persistence/prisma-challenge-verification.repository';
import { VerifyChallengesUseCase } from './application/use-cases/verify-challenges.use-case';
import { ChallengesController } from './interface/challenges.controller';
import { ChallengesFacade, ChallengesFacadeImpl } from './application/facades/challenges.facade';

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
    { provide: ChallengesFacade, useClass: ChallengesFacadeImpl },
  ],
  // B19: cross-context consumers depend on ChallengesFacade only.
  // IChallengeRepository and VerifyChallengesUseCase are now
  // module-internal.
  exports: [ChallengesFacade],
})
export class ChallengesModule {}
