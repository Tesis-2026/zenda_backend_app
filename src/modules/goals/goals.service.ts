import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name.trim(),
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        dueDate: dto.dueDate,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.savingsGoal.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async contribute(userId: string, id: string, dto: ContributeGoalDto) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        currentAmount: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return this.prisma.savingsGoal.update({
      where: {
        id: goal.id,
      },
      data: {
        currentAmount: goal.currentAmount.add(new Prisma.Decimal(dto.amount)),
      },
    });
  }

  async remove(userId: string, id: string) {
    const updated = await this.prisma.savingsGoal.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (!updated.count) {
      throw new NotFoundException('Goal not found');
    }

    return { success: true };
  }
}