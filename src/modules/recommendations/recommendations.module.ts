import { Module } from '@nestjs/common';
import { AiModule } from '../../infra/ai/ai.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IRecommendationRepository } from './domain/ports/recommendation.repository';
import { PrismaRecommendationRepository } from './infrastructure/persistence/prisma-recommendation.repository';
import { IConversationRepository } from './domain/ports/conversation.repository';
import { PrismaConversationRepository } from './infrastructure/persistence/prisma-conversation.repository';
import { GetRecommendationsUseCase } from './application/use-cases/get-recommendations.use-case';
import { SubmitFeedbackUseCase } from './application/use-cases/submit-feedback.use-case';
import { GetActiveConversationUseCase } from './application/use-cases/get-active-conversation.use-case';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { CloseActiveConversationUseCase } from './application/use-cases/close-active-conversation.use-case';
import { RecommendationsController } from './interface/recommendations.controller';
import { ChatController } from './interface/chat.controller';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [RecommendationsController, ChatController],
  providers: [
    { provide: IRecommendationRepository, useClass: PrismaRecommendationRepository },
    { provide: IConversationRepository, useClass: PrismaConversationRepository },
    GetRecommendationsUseCase,
    SubmitFeedbackUseCase,
    GetActiveConversationUseCase,
    SendChatMessageUseCase,
    CloseActiveConversationUseCase,
  ],
})
export class RecommendationsModule {}
