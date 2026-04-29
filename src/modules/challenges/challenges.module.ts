import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BadgesModule } from '../badges/badges.module';
import { IChallengeRepository } from './domain/ports/challenge.repository';
import { PrismaChallengeRepository } from './infrastructure/persistence/prisma-challenge.repository';
import { ChallengesController } from './interface/challenges.controller';

@Module({
  imports: [PrismaModule, BadgesModule],
  controllers: [ChallengesController],
  providers: [{ provide: IChallengeRepository, useClass: PrismaChallengeRepository }],
  exports: [IChallengeRepository],
})
export class ChallengesModule {}
