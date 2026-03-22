import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { ISavingsGoalRepository } from '../../domain/ports/savings-goal.repository';
import { SavingsGoalEntity } from '../../domain/savings-goal.entity';

@Injectable()
export class PrismaGoalsRepository implements ISavingsGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): SavingsGoalEntity {
    return SavingsGoalEntity.create({
      id: row.id,
      userId: row.userId,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async create(params: {
    userId: string;
    name: string;
    targetAmount: number;
    dueDate?: Date;
  }): Promise<SavingsGoalEntity> {
    const row = await this.prisma.savingsGoal.create({
      data: {
        userId: params.userId,
        name: params.name,
        targetAmount: new Decimal(params.targetAmount),
        dueDate: params.dueDate ?? null,
      },
    });
    return this.toEntity(row);
  }

  async findAll(userId: string): Promise<SavingsGoalEntity[]> {
    const rows = await this.prisma.savingsGoal.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string, userId: string): Promise<SavingsGoalEntity | null> {
    const row = await this.prisma.savingsGoal.findFirst({
      where: { id, userId, deletedAt: null },
    });
    return row ? this.toEntity(row) : null;
  }

  async updateCurrentAmount(id: string, newAmount: Decimal): Promise<SavingsGoalEntity> {
    const row = await this.prisma.savingsGoal.update({
      where: { id },
      data: { currentAmount: newAmount },
    });
    return this.toEntity(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.savingsGoal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
