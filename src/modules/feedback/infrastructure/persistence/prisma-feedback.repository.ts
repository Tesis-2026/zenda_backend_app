import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { FeedbackEntity, FeedbackKind } from '../../domain/feedback.entity';
import { IFeedbackRepository } from '../../domain/ports/feedback.repository';

@Injectable()
export class PrismaFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    type: FeedbackKind;
    message: string;
    screenName?: string | null;
    rating?: number | null;
  }): Promise<FeedbackEntity> {
    const row = await this.prisma.feedback.create({
      data: {
        userId: params.userId,
        type: params.type as FeedbackType,
        message: params.message,
        screenName: params.screenName ?? null,
        rating: params.rating ?? null,
      },
    });

    return FeedbackEntity.create({
      id: row.id,
      userId: row.userId,
      type: row.type as FeedbackKind,
      message: row.message,
      screenName: row.screenName,
      rating: row.rating,
      createdAt: row.createdAt,
    });
  }
}
