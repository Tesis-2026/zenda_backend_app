import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuditStatus } from '@prisma/client';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IPasswordResetTokenRepository } from '../../domain/ports/password-reset-token.repository';
import { EmailService } from '../../../../infra/email/email.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Silently succeed if user not found — prevents email enumeration.
    // Audit the attempt with FAILURE so we can still spot probe patterns.
    if (!user) {
      this.auditLog.record({
        action: 'FORGOT_PASSWORD',
        resource: 'User',
        status: AuditStatus.FAILURE,
        metadata: { reason: 'unknown_email', email: email.toLowerCase() },
      });
      return;
    }

    // Invalidate any existing tokens for this user
    await this.tokenRepository.deleteByUserId(user.id);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.tokenRepository.create({ userId: user.id, token, expiresAt });
    await this.emailService.sendPasswordResetEmail(user.email, token);

    this.auditLog.record({
      action: 'FORGOT_PASSWORD',
      resource: 'User',
      resourceId: user.id,
      userIdOverride: user.id,
    });
  }
}
