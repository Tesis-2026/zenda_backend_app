import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { EmailModule } from '../../infra/email/email.module';
import { IUserRepository } from './domain/ports/user.repository';
import { IPasswordResetTokenRepository } from './domain/ports/password-reset-token.repository';
import { IPasswordResetOtpRepository } from './domain/ports/password-reset-otp.repository';
import { IRefreshTokenRepository } from './domain/ports/refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaPasswordResetRepository } from './infrastructure/persistence/prisma-password-reset.repository';
import { PrismaPasswordResetOtpRepository } from './infrastructure/persistence/prisma-password-reset-otp.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { RefreshAccessTokenUseCase } from './application/use-cases/refresh-access-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { SendOtpUseCase } from './application/use-cases/send-otp.use-case';
import { VerifyOtpUseCase } from './application/use-cases/verify-otp.use-case';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AuthController } from './interface/auth.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('auth.jwtSecret'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: config.getOrThrow('auth.jwtExpiresIn') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: IUserRepository, useClass: PrismaUserRepository },
    { provide: IPasswordResetTokenRepository, useClass: PrismaPasswordResetRepository },
    { provide: IPasswordResetOtpRepository, useClass: PrismaPasswordResetOtpRepository },
    { provide: IRefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    RegisterUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    RefreshAccessTokenUseCase,
    LogoutUseCase,
    SendOtpUseCase,
    VerifyOtpUseCase,
    JwtStrategy,
  ],
  exports: [JwtModule, IUserRepository],
})
export class AuthModule {}
