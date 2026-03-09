import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    const name = dto.name.trim();

    const existingAccessible = await this.findByNameForUser(userId, name);
    if (existingAccessible) {
      if (existingAccessible.type === CategoryType.SYSTEM) {
        throw new BadRequestException('Category already exists as system category');
      }

      throw new BadRequestException('Category already exists for this user');
    }

    return this.prisma.category.create({
      data: {
        type: CategoryType.CUSTOM,
        userId,
        name,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [{ type: CategoryType.SYSTEM }, { type: CategoryType.CUSTOM, userId }],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async remove(userId: string, id: string) {
    const updated = await this.prisma.category.updateMany({
      where: {
        id,
        type: CategoryType.CUSTOM,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (!updated.count) {
      throw new NotFoundException('Category not found');
    }

    return { success: true };
  }

  async resolveCategoryForTransaction(userId: string, input: { categoryId?: string; newCategoryName?: string }) {
    if (input.categoryId && input.newCategoryName) {
      throw new BadRequestException('Send either categoryId or newCategoryName, not both');
    }

    if (input.categoryId) {
      const category = await this.findAccessibleById(userId, input.categoryId);
      if (!category) {
        throw new BadRequestException('categoryId is invalid for this user');
      }

      return category.id;
    }

    if (input.newCategoryName) {
      const normalizedName = input.newCategoryName.trim();
      if (!normalizedName) {
        throw new BadRequestException('newCategoryName must not be empty');
      }

      const existingCategory = await this.findByNameForUser(userId, normalizedName);
      if (existingCategory) {
        return existingCategory.id;
      }

      const createdCategory = await this.prisma.category.create({
        data: {
          name: normalizedName,
          type: CategoryType.CUSTOM,
          userId,
        },
      });

      return createdCategory.id;
    }

    return undefined;
  }

  private findAccessibleById(userId: string, id: string) {
    return this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ type: CategoryType.SYSTEM }, { type: CategoryType.CUSTOM, userId }],
      },
    });
  }

  private findByNameForUser(userId: string, name: string) {
    return this.prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        deletedAt: null,
        OR: [{ type: CategoryType.SYSTEM }, { type: CategoryType.CUSTOM, userId }],
      },
      orderBy: {
        type: 'asc',
      },
    });
  }
}