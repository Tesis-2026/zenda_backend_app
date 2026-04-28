import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IBadgeRepository } from './domain/ports/badge.repository';
import { PrismaBadgeRepository } from './infrastructure/persistence/prisma-badge.repository';
import { BadgesController } from './interface/badges.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BadgesController],
  providers: [{ provide: IBadgeRepository, useClass: PrismaBadgeRepository }],
  exports: [IBadgeRepository],
})
export class BadgesModule {}
