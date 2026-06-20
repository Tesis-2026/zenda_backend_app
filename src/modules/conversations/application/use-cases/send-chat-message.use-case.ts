import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AzureFoundryAgentClient, RagAgentSource } from '../../../../infra/ai/azure-foundry-agent.client';
import { IConversationRepository } from '../../domain/ports/conversation.repository';
import { FinancialContextService } from '../services/financial-context.service';

export interface ChatReply {
  conversationId: string;
  reply: string;
  answer: string;
  sources: RagAgentSource[];
  metadata: {
    agent: string;
    usedRag: boolean;
    mode?: 'foundry_agent' | 'classic_assistant';
    runId?: string;
    threadId?: string;
    responseId?: string;
    remoteConversationId?: string;
  };
}

@Injectable()
export class SendChatMessageUseCase {
  private readonly logger = new Logger(SendChatMessageUseCase.name);

  constructor(
    private readonly repo: IConversationRepository,
    private readonly financialContext: FinancialContextService,
    private readonly ragAgent: AzureFoundryAgentClient,
  ) {}

  async execute(userId: string, message: string): Promise<ChatReply> {
    const context = await this.financialContext.buildForUser(userId);
    const conversation = await this.repo.getOrCreateActive(userId);

    // Persist the user's message first, so the question is recorded for research
    // even if the downstream AI call fails.
    await this.repo.appendMessage(conversation.id, 'user', message);

    try {
      const ragResponse = await this.ragAgent.ask({
        financialContext: context.prompt,
        message,
        conversationHistory: conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      await this.repo.appendMessage(conversation.id, 'assistant', ragResponse.answer);
      this.logger.log(
        JSON.stringify({
          userId,
          conversationId: conversation.id,
          messageLength: message.length,
          sourcesCount: ragResponse.sources.length,
          usedRag: ragResponse.metadata.usedRag,
        }),
      );

      return {
        conversationId: conversation.id,
        reply: ragResponse.answer,
        answer: ragResponse.answer,
        sources: ragResponse.sources,
        metadata: ragResponse.metadata,
      };
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          userId,
          conversationId: conversation.id,
          messageLength: message.length,
          errorName: err instanceof Error ? err.name : 'UnknownError',
        }),
        err instanceof Error ? err.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'El asistente financiero no esta disponible en este momento. Intenta nuevamente.',
      );
    }
  }
}
