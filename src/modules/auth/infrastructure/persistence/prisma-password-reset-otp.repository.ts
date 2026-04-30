import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { IPasswordResetOtpRepository, OtpRecord } from '../../domain/ports/password-reset-otp.repository';

@Injectable()
export class PrismaPasswordResetOtpRepository implements IPasswordResetOtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: { userId: string; email: string; code: string; expiresAt: Date }): Promise<OtpRecord> {
    return this.prisma.passwordResetOtp.create({ data: params });
  }

  async findValid(email: string, code: string): Promise<OtpRecord | null> {
    const record = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return record ?? null;
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetOtp.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.passwordResetOtp.deleteMany({ where: { userId } });
  }
}
