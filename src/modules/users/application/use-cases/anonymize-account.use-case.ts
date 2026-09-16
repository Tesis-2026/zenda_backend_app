import { Injectable, NotFoundException } from '@nestjs/common';
import { AiConversationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../infra/prisma/prisma.service';

@Injectable()
export class AnonymizeAccountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        consentGiven: true,
        consentAt: true,
        privacyPolicyVersion: true,
        termsVersion: true,
      },
    });

    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const now = new Date();
    const anonymizedEmail = `deleted-${userId}@zenda.anonymized.local`;
    const invalidPasswordHash = `ANONYMIZED:${randomBytes(32).toString('hex')}`;

    await this.prisma.$transaction([
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'ANONYMIZE_ACCOUNT',
          resource: 'User',
          resourceId: userId,
          beforeJson: {
            consentGiven: existing.consentGiven,
            consentAt: existing.consentAt,
            privacyPolicyVersion: existing.privacyPolicyVersion,
            termsVersion: existing.termsVersion,
          },
          afterJson: {
            email: anonymizedEmail,
            fullName: 'Usuario anonimizado',
            deletedAt: now,
            dataAnonymizedAt: now,
            anonymizationReason: 'USER_REQUEST',
          },
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.authChallenge.deleteMany({ where: { userId } }),
      this.prisma.aiConversation.updateMany({
        where: { userId, status: AiConversationStatus.ACTIVE },
        data: { status: AiConversationStatus.CLOSED, endedAt: now },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          fullName: 'Usuario anonimizado',
          passwordHash: invalidPasswordHash,
          age: null,
          university: null,
          incomeType: null,
          averageMonthlyIncome: null,
          financialLiteracyLevel: null,
          profileCompleted: false,
          consentGiven: false,
          consentIp: null,
          consentUserAgent: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          tokenVersion: { increment: 1 },
          notificationPrefs: {},
          fcmToken: null,
          dailyReminderAt: null,
          dataAnonymizedAt: now,
          anonymizationReason: 'USER_REQUEST',
          deletedAt: now,
        },
      }),
    ]);
  }
}
