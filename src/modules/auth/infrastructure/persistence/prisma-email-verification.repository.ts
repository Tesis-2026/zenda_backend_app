import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AuthChallengeKind } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  EmailVerificationChallenge,
  IEmailVerificationRepository,
} from '../../domain/ports/email-verification.repository';

@Injectable()
export class PrismaEmailVerificationRepository
  implements IEmailVerificationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashCode(email: string, code: string): string {
    return createHash('sha256')
      .update(`${this.normalizeEmail(email)}:${code}`)
      .digest('hex');
  }

  async create(params: {
    userId: string;
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<EmailVerificationChallenge> {
    const email = this.normalizeEmail(params.email);
    const row = await this.prisma.authChallenge.create({
      data: {
        userId: params.userId,
        kind: AuthChallengeKind.EMAIL_VERIFICATION_OTP,
        secret: this.hashCode(email, params.code),
        email,
        expiresAt: params.expiresAt,
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      email: row.email ?? email,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async findValid(
    email: string,
    code: string,
  ): Promise<EmailVerificationChallenge | null> {
    const normalizedEmail = this.normalizeEmail(email);
    const row = await this.prisma.authChallenge.findFirst({
      where: {
        kind: AuthChallengeKind.EMAIL_VERIFICATION_OTP,
        email: normalizedEmail,
        secret: this.hashCode(normalizedEmail, code),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      email: row.email ?? normalizedEmail,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.authChallenge.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.authChallenge.deleteMany({
      where: { userId, kind: AuthChallengeKind.EMAIL_VERIFICATION_OTP },
    });
  }
}
