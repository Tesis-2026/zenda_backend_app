import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime()) || occurredAt > new Date()) {
      throw new BadRequestException('occurredAt must not be in the future');
    }

    const resolvedCategoryId = await this.categoriesService.resolveCategoryForTransaction(userId, {
      categoryId: dto.categoryId,
      newCategoryName: dto.newCategoryName,
    });

    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: resolvedCategoryId,
        type: dto.type,
        currency: (dto.currency ?? 'PEN').toUpperCase(),
        amount: dto.amount,
        description: dto.description,
        occurredAt,
      },
    });
  }

  async findAll(userId: string, query: ListTransactionsDto) {
    const occurredAt: Prisma.DateTimeFilter | undefined =
      query.from || query.to
        ? {
            gte: query.from,
            lte: query.to,
          }
        : undefined;

    return this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: query.type,
        categoryId: query.categoryId,
        occurredAt,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
  }

  async remove(userId: string, id: string) {
    const updated = await this.prisma.transaction.updateMany({
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
      throw new NotFoundException('Transaction not found');
    }

    return { success: true };
  }
}
