import { Injectable } from '@nestjs/common';
import { AuditStatus } from '@prisma/client';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository';
import { EmailService } from '../../../../infra/email/email.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

const OTP_EXPIRY_MINUTES = 15;

@Injectable()
export class SendOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IPasswordResetOtpRepository,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      // Silent at the API boundary to prevent enumeration, but we still
      // audit the attempt — useful signal for spotting probe patterns.
      this.auditLog.record({
        action: 'SEND_OTP',
        resource: 'User',
        status: AuditStatus.FAILURE,
        metadata: { reason: 'unknown_email', email: email.toLowerCase() },
      });
      return;
    }

    await this.otpRepository.deleteByUserId(user.id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpRepository.create({ userId: user.id, email: email.toLowerCase(), code, expiresAt });
    await this.emailService.sendOtpEmail(user.email, code);

    this.auditLog.record({
      action: 'SEND_OTP',
      resource: 'User',
      resourceId: user.id,
      userIdOverride: user.id,
      // Code is intentionally not recorded — would defeat the point of OTP.
    });
  }
}
