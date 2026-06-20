import { Injectable } from '@nestjs/common';
import { ConversationEntity } from '../../domain/conversation.entity';
import { IConversationRepository } from '../../domain/ports/conversation.repository';

@Injectable()
export class GetActiveConversationUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  /**
   * Returns the user's current chat history. Prefer an ACTIVE conversation,
   * but fall back to the latest CLOSED one so history survives logout.
   */
  async execute(userId: string): Promise<ConversationEntity | null> {
    return (
      (await this.repo.findActiveByUserId(userId)) ??
      (await this.repo.findLatestByUserId(userId))
    );
  }
}
