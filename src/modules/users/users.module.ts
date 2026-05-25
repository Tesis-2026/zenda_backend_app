import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { IUserProfileRepository } from './domain/ports/user-profile.repository';
import { PrismaUserProfileRepository } from './infrastructure/persistence/prisma-user-profile.repository';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { UsersController } from './interface/users.controller';
import { NotificationsController } from './interface/notifications.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController, NotificationsController],
  providers: [
    { provide: IUserProfileRepository, useClass: PrismaUserProfileRepository },
    GetProfileUseCase,
    UpdateProfileUseCase,
  ],
})
export class UsersModule {}
