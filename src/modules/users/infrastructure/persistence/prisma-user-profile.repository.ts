import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  IUserProfileRepository,
  UpdateProfileData,
} from '../../domain/ports/user-profile.repository';
import {
  FinancialLiteracyLevel,
  IncomeType,
  UserProfileEntity,
} from '../../domain/user-profile.entity';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserProfileEntity | null> {
    const row = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
    if (!row) return null;
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateProfileData): Promise<UserProfileEntity> {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.age !== undefined) updateData.age = data.age;
    if (data.university !== undefined) updateData.university = data.university;
    if (data.incomeType !== undefined) updateData.incomeType = data.incomeType;
    if (data.averageMonthlyIncome !== undefined) {
      updateData.averageMonthlyIncome = data.averageMonthlyIncome;
    }
    if (data.financialLiteracyLevel !== undefined) {
      updateData.financialLiteracyLevel = data.financialLiteracyLevel;
    }
    if (data.profileCompleted !== undefined) {
      updateData.profileCompleted = data.profileCompleted;
    }
    if (data.currency !== undefined) updateData.currency = data.currency;

    const row = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (!row) throw new NotFoundException('User not found');
    return this.toEntity(row);
  }

  private toEntity(row: {
    id: string;
    email: string;
    fullName: string;
    age: number | null;
    university: string | null;
    incomeType: string | null;
    averageMonthlyIncome: unknown;
    financialLiteracyLevel: string | null;
    profileCompleted: boolean;
    currency: string;
    createdAt: Date;
  }): UserProfileEntity {
    return UserProfileEntity.create({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      age: row.age,
      university: row.university,
      incomeType: row.incomeType as IncomeType | null,
      averageMonthlyIncome: row.averageMonthlyIncome != null
        ? Number(row.averageMonthlyIncome)
        : null,
      financialLiteracyLevel: row.financialLiteracyLevel as FinancialLiteracyLevel | null,
      profileCompleted: row.profileCompleted,
      currency: row.currency,
      createdAt: row.createdAt,
    });
  }
}
