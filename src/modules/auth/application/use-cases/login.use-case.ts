import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { AnalyticsService } from '../../../../infra/analytics/analytics.service';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

export interface LoginCommand {
  email: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  async execute(cmd: LoginCommand): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(cmd.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isLocked) {
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${LOCKOUT_MINUTES} minutes.`,
      );
    }

    const valid = await bcrypt.compare(cmd.password, user.passwordHash);
    if (!valid) {
      await this.userRepository.incrementFailedLogin(user.id);

      const attempts = user.failedLoginAttempts + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await this.userRepository.lockAccount(user.id, lockUntil);
        throw new UnauthorizedException(
          `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        );
      }

      const remaining = MAX_FAILED_ATTEMPTS - attempts;
      throw new UnauthorizedException(
        `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
      );
    }

    await this.userRepository.clearFailedLogin(user.id);

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    const refreshToken = await this._issueRefreshToken(user.id);

    this.analytics.track(user.id, 'login');

    return { accessToken, refreshToken };
  }

  private async _issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(40).toString('hex');
    const days = this.config.get<number>('auth.refreshTokenExpiresDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId, token, expiresAt });
    return token;
  }
}
