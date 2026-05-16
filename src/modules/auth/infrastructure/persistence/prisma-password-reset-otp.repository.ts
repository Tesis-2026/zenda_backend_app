import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AuthChallengeKind } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { IPasswordResetOtpRepository, OtpRecord } from '../../domain/ports/password-reset-otp.repository';

@Injectable()
export class PrismaPasswordResetOtpRepository implements IPasswordResetOtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async create(params: { userId: string; email: string; code: string; expiresAt: Date }): Promise<OtpRecord> {
    const row = await this.prisma.authChallenge.create({
      data: {
        userId: params.userId,
        kind: AuthChallengeKind.OTP,
        secret: this.hashCode(params.code),
        email: params.email,
        expiresAt: params.expiresAt,
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      email: row.email ?? params.email,
      code: row.secret,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async findValid(email: string, code: string): Promise<OtpRecord | null> {
    const row = await this.prisma.authChallenge.findFirst({
      where: {
        kind: AuthChallengeKind.OTP,
        email: email.toLowerCase(),
        secret: this.hashCode(code),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      email: row.email ?? email.toLowerCase(),
      code: row.secret,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.authChallenge.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.authChallenge.deleteMany({
      where: { userId, kind: AuthChallengeKind.OTP },
    });
  }
}
