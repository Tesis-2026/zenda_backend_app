import { Injectable } from '@nestjs/common';
import { AiConversationStatus, AiMessageRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { UserProfile } from '../../../../infra/ai/AiProvider';
import {
  ChatMessageEntity,
  ChatRole,
  ConversationEntity,
  ConversationStatus,
} from '../../domain/conversation.entity';
import { IConversationRepository } from '../../domain/ports/conversation.repository';

type ConversationRow = Prisma.AiConversationGetPayload<{ include: { messages: true } }>;

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserId(userId: string): Promise<ConversationEntity | null> {
    const row = await this.prisma.aiConversation.findFirst({
      where: { userId, status: AiConversationStatus.ACTIVE },
      orderBy: { startedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return row ? this.toEntity(row) : null;
  }

  async getOrCreateActive(userId: string): Promise<ConversationEntity> {
    const existing = await this.findActiveByUserId(userId);
    if (existing) return existing;

    const created = await this.prisma.aiConversation.create({
      data: { userId, status: AiConversationStatus.ACTIVE },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toEntity(created);
  }

  async appendMessage(conversationId: string, role: ChatRole, content: string): Promise<ChatMessageEntity> {
    const row = await this.prisma.aiMessage.create({
      data: { conversationId, role: this.toPrismaRole(role), content },
    });
    return new ChatMessageEntity(row.id, row.conversationId, role, row.content, row.createdAt);
  }

  async closeActiveByUserId(userId: string): Promise<void> {
    // updateMany (not update) defensively closes any ACTIVE conversation, even if more
    // than one slipped through the service-layer "one active per user" invariant.
    await this.prisma.aiConversation.updateMany({
      where: { userId, status: AiConversationStatus.ACTIVE },
      data: { status: AiConversationStatus.CLOSED, endedAt: new Date() },
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialLiteracyLevel: true,
        age: true,
        university: true,
        incomeType: true,
        averageMonthlyIncome: true,
      },
    });
    return {
      financialLiteracyLevel:
        (user?.financialLiteracyLevel as UserProfile['financialLiteracyLevel']) ?? null,
      age: user?.age ?? null,
      university: user?.university ?? null,
      incomeType: user?.incomeType ?? null,
      averageMonthlyIncome: user?.averageMonthlyIncome?.toNumber() ?? null,
    };
  }

  // ── mappers (Prisma ↔ domain boundary) ───────────────────────────────
  private toEntity(row: ConversationRow): ConversationEntity {
    return new ConversationEntity(
      row.id,
      row.userId,
      row.status as ConversationStatus,
      row.startedAt,
      row.endedAt,
      row.messages.map(
        (m) =>
          new ChatMessageEntity(m.id, m.conversationId, this.toDomainRole(m.role), m.content, m.createdAt),
      ),
    );
  }

  private toPrismaRole(role: ChatRole): AiMessageRole {
    return role === 'user' ? AiMessageRole.USER : AiMessageRole.ASSISTANT;
  }

  private toDomainRole(role: AiMessageRole): ChatRole {
    return role === AiMessageRole.USER ? 'user' : 'assistant';
  }
}
