import { Module } from '@nestjs/common';
import { AiModule } from '../../infra/ai/ai.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IConversationRepository } from './domain/ports/conversation.repository';
import { PrismaConversationRepository } from './infrastructure/persistence/prisma-conversation.repository';
import { GetActiveConversationUseCase } from './application/use-cases/get-active-conversation.use-case';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { CloseActiveConversationUseCase } from './application/use-cases/close-active-conversation.use-case';
import { ChatController } from './interface/chat.controller';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ChatController],
  providers: [
    { provide: IConversationRepository, useClass: PrismaConversationRepository },
    GetActiveConversationUseCase,
    SendChatMessageUseCase,
    CloseActiveConversationUseCase,
  ],
})
export class ConversationsModule {}
