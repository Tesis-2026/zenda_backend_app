import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuditStatus } from '@prisma/client';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository';
import { IPasswordResetTokenRepository } from '../../domain/ports/password-reset-token.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    private readonly otpRepository: IPasswordResetOtpRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(email: string, code: string): Promise<{ resetToken: string }> {
    const otp = await this.otpRepository.findValid(email.toLowerCase(), code);
    if (!otp) {
      // Brute-force / wrong-code attempts go in the audit log without
      // any user link (we don't know which account was targeted unless
      // the email matches a real user, and even then we shouldn't bind
      // a failed attempt to the victim's userId).
      this.auditLog.record({
        action: 'VERIFY_OTP',
        resource: 'User',
        status: AuditStatus.FAILURE,
        metadata: { reason: 'invalid_or_expired', email: email.toLowerCase() },
      });
      throw new BadRequestException('Invalid or expired code.');
    }

    await this.otpRepository.markUsed(otp.id);

    // Issue a standard reset token so the existing reset-password endpoint handles the rest
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.tokenRepository.deleteByUserId(otp.userId);
    await this.tokenRepository.create({ userId: otp.userId, token, expiresAt });

    this.auditLog.record({
      action: 'VERIFY_OTP',
      resource: 'User',
      resourceId: otp.userId,
      userIdOverride: otp.userId,
    });

    return { resetToken: token };
  }
}
