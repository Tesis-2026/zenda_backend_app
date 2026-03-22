import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IUserRepository } from './domain/ports/user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AuthController } from './interface/auth.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: config.get('auth.jwtExpiresIn') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: IUserRepository, useClass: PrismaUserRepository },
    RegisterUseCase,
    LoginUseCase,
    JwtStrategy,
  ],
  exports: [JwtModule, IUserRepository],
})
export class AuthModule {}
