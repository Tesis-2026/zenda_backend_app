import { Injectable } from '@nestjs/common';
import { CategoryType as PrismaCategoryType, TransactionType as PrismaTransactionType } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';
import { CategoryType } from '../../domain/category-type.enum';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): CategoryEntity {
    return CategoryEntity.create({
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      userId: row.userId,
      transactionType: row.transactionType as TransactionType | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async findAllForUser(userId: string): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [
          { type: PrismaCategoryType.SYSTEM },
          { type: PrismaCategoryType.CUSTOM, userId },
        ],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string, userId: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { type: PrismaCategoryType.SYSTEM },
          { type: PrismaCategoryType.CUSTOM, userId },
        ],
      },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByNameForUser(name: string, userId: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        OR: [
          { type: PrismaCategoryType.SYSTEM },
          { type: PrismaCategoryType.CUSTOM, userId },
        ],
      },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(params: {
    name: string;
    userId: string;
    transactionType?: TransactionType;
  }): Promise<CategoryEntity> {
    const row = await this.prisma.category.create({
      data: {
        name: params.name,
        type: PrismaCategoryType.CUSTOM,
        userId: params.userId,
        transactionType: (params.transactionType as PrismaTransactionType) ?? null,
      },
    });
    return this.toEntity(row);
  }

  async update(id: string, name: string): Promise<CategoryEntity> {
    const row = await this.prisma.category.update({
      where: { id },
      data: { name },
    });
    return this.toEntity(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
