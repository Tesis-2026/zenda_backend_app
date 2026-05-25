import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { IUserRepository } from '../../domain/ports/user.repository';
import { UserEntity } from '../../domain/user.entity';

type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  createdAt: Date;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  tokenVersion: number;
  consentGiven: boolean;
  deletedAt: Date | null;
};

function toEntity(row: UserRow): UserEntity {
  return UserEntity.create({
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    fullName: row.fullName,
    createdAt: row.createdAt,
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: row.lockedUntil,
    tokenVersion: row.tokenVersion,
    consentGiven: row.consentGiven,
    deletedAt: row.deletedAt,
  });
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!row) return null;
    return toEntity(row);
  }

  async findById(id: string): Promise<UserEntity | null> {
    // NOTE: callers use this to validate active sessions, so we must include
    // soft-deleted users and let the caller inspect `deletedAt` rather than
    // filtering them silently — otherwise a deleted user looks identical to
    // a never-existed one and we lose the information needed to reject the
    // JWT with a specific message.
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return toEntity(row);
  }

  async create(params: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<UserEntity> {
    const row = await this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash: params.passwordHash,
        fullName: params.fullName,
      },
    });
    return toEntity(row);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async incrementFailedLogin(userId: string): Promise<number> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    return updated.failedLoginAttempts;
  }

  async clearFailedLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: until },
    });
  }

  async bumpTokenVersion(userId: string): Promise<number> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    return updated.tokenVersion;
  }
}
