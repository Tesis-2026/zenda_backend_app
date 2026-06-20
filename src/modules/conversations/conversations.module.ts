import { Module } from '@nestjs/common';
import { AiModule } from '../../infra/ai/ai.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IConversationRepository } from './domain/ports/conversation.repository';
import { PrismaConversationRepository } from './infrastructure/persistence/prisma-conversation.repository';
import { GetActiveConversationUseCase } from './application/use-cases/get-active-conversation.use-case';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { CloseActiveConversationUseCase } from './application/use-cases/close-active-conversation.use-case';
import { FinancialContextService } from './application/services/financial-context.service';
import { ChatController } from './interface/chat.controller';

/**
 * AI chat / message bounded context (B7).
 *
 * Previously bundled into RecommendationsModule, which conflated two
 * distinct concerns: rule-based recommendations (data products derived
 * from the user's spending) and the AI conversation (free-form chat
 * with persisted history). Splitting them lets each evolve on its own
 * cadence — e.g. swapping the AI provider doesn't need to touch
 * recommendation code, and rate-limit / throttle policy for chat
 * lives next to the chat controller.
 */
@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ChatController],
  providers: [
    { provide: IConversationRepository, useClass: PrismaConversationRepository },
    GetActiveConversationUseCase,
    SendChatMessageUseCase,
    CloseActiveConversationUseCase,
    FinancialContextService,
  ],
})
export class ConversationsModule {}
