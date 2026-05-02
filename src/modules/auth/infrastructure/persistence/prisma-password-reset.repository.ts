import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
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
    return this.prisma.passwordResetToken.create({
      data: { ...params, token: this.hashToken(params.token) },
    });
  }

  async findByToken(token: string): Promise<PasswordResetTokenData | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { token: this.hashToken(token) } });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
  }
}
