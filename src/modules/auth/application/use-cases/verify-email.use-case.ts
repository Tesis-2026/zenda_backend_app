import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuditStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IEmailVerificationRepository } from '../../domain/ports/email-verification.repository';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

export interface VerifyEmailResult {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly emailVerificationRepository: IEmailVerificationRepository,
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(email: string, code: string): Promise<VerifyEmailResult> {
    const challenge = await this.emailVerificationRepository.findValid(
      email.toLowerCase(),
      code,
    );
    if (!challenge) {
      this.auditLog.record({
        action: 'VERIFY_EMAIL',
        resource: 'User',
        status: AuditStatus.FAILURE,
        metadata: { reason: 'invalid_or_expired', email: email.toLowerCase() },
      });
      throw new BadRequestException('Invalid or expired verification code.');
    }

    await this.emailVerificationRepository.markUsed(challenge.id);
    const user = await this.userRepository.markEmailVerified(
      challenge.userId,
      new Date(),
    );

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      consentGiven: user.consentGiven,
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    this.auditLog.record({
      action: 'VERIFY_EMAIL',
      resource: 'User',
      resourceId: user.id,
      userIdOverride: user.id,
    });

    return { userId: user.id, accessToken, refreshToken };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(40).toString('hex');
    const days = this.config.get<number>('auth.refreshTokenExpiresDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId, token, expiresAt });
    return token;
  }
}
