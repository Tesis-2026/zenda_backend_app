import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IBadgeRepository } from './domain/ports/badge.repository';
import { PrismaBadgeRepository } from './infrastructure/persistence/prisma-badge.repository';
import { BadgesController } from './interface/badges.controller';
import { BadgesFacade, BadgesFacadeImpl } from './application/facades/badges.facade';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BadgesController],
  providers: [
    { provide: IBadgeRepository, useClass: PrismaBadgeRepository },
    { provide: BadgesFacade, useClass: BadgesFacadeImpl },
  ],
  // B19: only the facade is exported. IBadgeRepository stays
  // module-internal so other contexts cannot reach into Badges.
  exports: [BadgesFacade],
})
export class BadgesModule {}
