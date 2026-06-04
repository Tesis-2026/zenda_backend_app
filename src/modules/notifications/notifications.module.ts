import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { FcmModule } from '../../infra/fcm/fcm.module';
import { AuthModule } from '../auth/auth.module';
import { ListInboxUseCase } from './application/use-cases/list-inbox.use-case';
import { MarkReadUseCase } from './application/use-cases/mark-read.use-case';
import { RegisterFcmTokenUseCase } from './application/use-cases/register-fcm-token.use-case';
import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification.repository';
import { NOTIFICATION_USER_PORT } from './domain/ports/notification-user.port';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { PrismaNotificationUserAdapter } from './infrastructure/persistence/prisma-notification-user.adapter';
import { NotificationsInboxController } from './interface/notifications-inbox.controller';
import { NotificationsScheduleService } from './schedule/notifications-schedule.service';

@Module({
  imports: [PrismaModule, AuthModule, FcmModule],
  controllers: [NotificationsInboxController],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    { provide: NOTIFICATION_USER_PORT, useClass: PrismaNotificationUserAdapter },
    ListInboxUseCase,
    MarkReadUseCase,
    RegisterFcmTokenUseCase,
    SendNotificationUseCase,
    NotificationsScheduleService,
  ],
  // Exported so cross-module event hooks (badges, predictions, anomaly detection)
  // can dispatch notifications without re-implementing the inbox + FCM glue.
  exports: [SendNotificationUseCase],
})
export class NotificationsModule {}
