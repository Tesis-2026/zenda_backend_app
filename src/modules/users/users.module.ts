import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { IUserProfileRepository } from './domain/ports/user-profile.repository';
import { INotificationPreferenceRepository } from './domain/ports/notification-preference.repository';
import { PrismaUserProfileRepository } from './infrastructure/persistence/prisma-user-profile.repository';
import { PrismaNotificationPreferenceRepository } from './infrastructure/persistence/prisma-notification-preference.repository';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { GetNotificationPreferencesUseCase } from './application/use-cases/get-notification-preferences.use-case';
import { UpdateNotificationPreferenceUseCase } from './application/use-cases/update-notification-preference.use-case';
import { UsersController } from './interface/users.controller';
import { NotificationsController } from './interface/notifications.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController, NotificationsController],
  providers: [
    { provide: IUserProfileRepository, useClass: PrismaUserProfileRepository },
    { provide: INotificationPreferenceRepository, useClass: PrismaNotificationPreferenceRepository },
    GetProfileUseCase,
    UpdateProfileUseCase,
    GetNotificationPreferencesUseCase,
    UpdateNotificationPreferenceUseCase,
  ],
})
export class UsersModule {}
