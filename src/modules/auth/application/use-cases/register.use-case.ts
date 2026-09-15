import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IEmailVerificationRepository } from '../../domain/ports/email-verification.repository';
import { EmailService } from '../../../../infra/email/email.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

const EMAIL_VERIFICATION_EXPIRY_MINUTES = 15;

export interface RegisterCommand {
  email: string;
  password: string;
  fullName: string;
  consentGiven: true;
  privacyPolicyVersion?: string;
  termsVersion?: string;
  consentIp?: string | null;
  consentUserAgent?: string | null;
}

export interface RegisterResult {
  userId: string;
  email: string;
  requiresEmailVerification: true;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly config: ConfigService,
    private readonly emailVerificationRepository: IEmailVerificationRepository,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(cmd: RegisterCommand): Promise<RegisterResult> {
    const existing = await this.userRepository.findByEmail(cmd.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(cmd.password, rounds);

    const user = await this.userRepository.create({
      email: cmd.email,
      passwordHash,
      fullName: cmd.fullName,
      consentGiven: cmd.consentGiven,
      consentAt: new Date(),
      privacyPolicyVersion: cmd.privacyPolicyVersion ?? 'privacy-2026-07-03',
      termsVersion: cmd.termsVersion ?? 'terms-2026-07-03',
      consentIp: cmd.consentIp ?? null,
      consentUserAgent: cmd.consentUserAgent ?? null,
      emailVerifiedAt: null,
    });

    await this.emailVerificationRepository.deleteByUserId(user.id);
    const code = randomInt(100000, 1000000).toString();
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

    // Request context's userId isn't populated for register (JWT guard
    // hasn't run yet), so we pass it explicitly via userIdOverride.
    this.auditLog.record({
      action: 'REGISTER',
      resource: 'User',
      resourceId: user.id,
      userIdOverride: user.id,
      afterJson: {
        email: user.email,
        fullName: user.fullName,
        consentGiven: user.consentGiven,
        privacyPolicyVersion: cmd.privacyPolicyVersion ?? 'privacy-2026-07-03',
        termsVersion: cmd.termsVersion ?? 'terms-2026-07-03',
        emailVerificationSent: true,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      requiresEmailVerification: true,
    };
  }
}
