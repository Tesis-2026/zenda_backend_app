import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AuthChallengeKind } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  IPasswordResetTokenRepository,
  PasswordResetTokenData,
} from '../../domain/ports/password-reset-token.repository';

@Injectable()
export class PrismaPasswordResetRepository
  implements IPasswordResetTokenRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(params: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenData> {
    const row = await this.prisma.authChallenge.create({
      data: {
        userId: params.userId,
        kind: AuthChallengeKind.RESET_TOKEN,
        secret: this.hashToken(params.token),
        expiresAt: params.expiresAt,
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      token: row.secret,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async findByToken(token: string): Promise<PasswordResetTokenData | null> {
    const row = await this.prisma.authChallenge.findUnique({
      where: { kind_secret: { kind: AuthChallengeKind.RESET_TOKEN, secret: this.hashToken(token) } },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      token: row.secret,
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
      where: { userId, kind: AuthChallengeKind.RESET_TOKEN },
    });
  }
}
