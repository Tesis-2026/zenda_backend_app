import { Injectable } from '@nestjs/common';
import { AuditStatus } from '@prisma/client';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IEmailVerificationRepository } from '../../domain/ports/email-verification.repository';
import { EmailService } from '../../../../infra/email/email.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

const EMAIL_VERIFICATION_EXPIRY_MINUTES = 15;

@Injectable()
export class ResendEmailVerificationUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailVerificationRepository: IEmailVerificationRepository,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      this.auditLog.record({
        action: 'RESEND_EMAIL_VERIFICATION',
        resource: 'User',
        status: AuditStatus.FAILURE,
        metadata: { reason: 'unknown_email', email: normalizedEmail },
      });
      return;
    }

    if (user.isEmailVerified) {
      this.auditLog.record({
        action: 'RESEND_EMAIL_VERIFICATION',
        resource: 'User',
        resourceId: user.id,
        userIdOverride: user.id,
        metadata: { skipped: 'already_verified' },
      });
      return;
    }

    await this.emailVerificationRepository.deleteByUserId(user.id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000,
    );
    await this.emailVerificationRepository.create({
      userId: user.id,
      email: user.email,
      code,
      expiresAt,
    });
    await this.emailService.sendAccountVerificationEmail(user.email, code);

    this.auditLog.record({
      action: 'RESEND_EMAIL_VERIFICATION',
      resource: 'User',
      resourceId: user.id,
      userIdOverride: user.id,
    });
  }
}
