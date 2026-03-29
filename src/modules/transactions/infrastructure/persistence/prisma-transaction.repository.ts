import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  ITransactionRepository,
  TransactionFilters,
  TransactionWithCategory,
} from '../../domain/ports/transaction.repository';
import { TransactionEntity } from '../../domain/transaction.entity';

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): TransactionEntity {
    return TransactionEntity.create({
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async create(params: {
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description?: string;
    occurredAt: Date;
  }): Promise<TransactionWithCategory> {
    const row = await this.prisma.transaction.create({
      data: {
        userId: params.userId,
        categoryId: params.categoryId,
        type: params.type,
        amount: new Decimal(params.amount),
        currency: params.currency,
        description: params.description ?? '',
        occurredAt: params.occurredAt,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return row as TransactionWithCategory;
  }

  async findAll(
    userId: string,
    filters: TransactionFilters,
  ): Promise<TransactionWithCategory[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(filters.type && { type: filters.type }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.from || filters.to
          ? {
              occurredAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      include: { category: { select: { id: true, name: true } } },
    });
    return rows as TransactionWithCategory[];
  }

  async findById(id: string, userId: string): Promise<TransactionEntity | null> {
    const row = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    return row ? this.toEntity(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
