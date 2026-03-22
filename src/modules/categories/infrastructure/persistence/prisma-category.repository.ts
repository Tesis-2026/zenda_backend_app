import { Injectable } from '@nestjs/common';
import { CategoryType, TransactionType } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { ICategoryRepository } from '../../domain/ports/category.repository';
import { CategoryEntity } from '../../domain/category.entity';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): CategoryEntity {
    return CategoryEntity.create({
      id: row.id,
      name: row.name,
      type: row.type,
      userId: row.userId,
      transactionType: row.transactionType,
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
          { type: CategoryType.SYSTEM },
          { type: CategoryType.CUSTOM, userId },
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
          { type: CategoryType.SYSTEM },
          { type: CategoryType.CUSTOM, userId },
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
          { type: CategoryType.SYSTEM },
          { type: CategoryType.CUSTOM, userId },
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
        type: CategoryType.CUSTOM,
        userId: params.userId,
        transactionType: params.transactionType ?? null,
      },
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
