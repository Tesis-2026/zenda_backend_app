import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { NotificationsController } from './interface/notifications.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
