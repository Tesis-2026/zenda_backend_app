import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from '../../../../infra/ai/ai.module';
import { AiProvider, ChatMessage } from '../../../../infra/ai/AiProvider';
import { IConversationRepository } from '../../domain/ports/conversation.repository';

export interface ChatReply {
  conversationId: string;
  reply: string;
}

@Injectable()
export class SendChatMessageUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async execute(userId: string, message: string): Promise<ChatReply> {
    const conversation = await this.repo.getOrCreateActive(userId);

    // Persist the user's message first, so the question is recorded for research
    // even if the downstream AI call fails.
    await this.repo.appendMessage(conversation.id, 'user', message);

    const userProfile = await this.repo.getUserProfile(userId);
    const history: ChatMessage[] = [
      ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const reply = await this.ai.chat(history, userProfile);
    await this.repo.appendMessage(conversation.id, 'assistant', reply);

    return { conversationId: conversation.id, reply };
  }
}
