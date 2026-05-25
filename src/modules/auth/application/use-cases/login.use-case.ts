import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuditStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(cmd.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isLocked) {
      // Account is already locked — surface the unlock time so the
      // frontend can render a server-authoritative countdown (B14).
      throw new UnauthorizedException({
        message: `Account temporarily locked. Try again later.`,
        error: 'Unauthorized',
        failedAttempts: null, // intentionally hidden once locked
        attemptsRemaining: 0,
        lockedUntil: user.lockedUntil!.toISOString(),
      });
    }

    const valid = await bcrypt.compare(cmd.password, user.passwordHash);
    if (!valid) {
      const attempts = await this.userRepository.incrementFailedLogin(user.id);

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await this.userRepository.lockAccount(user.id, lockUntil);
        this.auditLog.record({
          action: 'LOGIN_LOCKED',
          resource: 'User',
          resourceId: user.id,
          userIdOverride: user.id,
          status: AuditStatus.FAILURE,
          metadata: { lockUntil: lockUntil.toISOString(), attempts },
        });
        throw new UnauthorizedException({
          message: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          error: 'Unauthorized',
          failedAttempts: attempts,
          attemptsRemaining: 0,
          lockedUntil: lockUntil.toISOString(),
        });
      }

      this.auditLog.record({
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        userIdOverride: user.id,
        status: AuditStatus.FAILURE,
        metadata: { attempts },
      });

      const remaining = MAX_FAILED_ATTEMPTS - attempts;
      throw new UnauthorizedException({
        message: `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
        error: 'Unauthorized',
        failedAttempts: attempts,
        attemptsRemaining: remaining,
        lockedUntil: null,
      });
    }

    await this.userRepository.clearFailedLogin(user.id);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      consentGiven: user.consentGiven,
    });
    const refreshToken = await this._issueRefreshToken(user.id);

    return { userId: user.id, accessToken, refreshToken };
  }

  private async _issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(40).toString('hex');
    const days = this.config.get<number>('auth.refreshTokenExpiresDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId, token, expiresAt });
    return token;
  }
}
