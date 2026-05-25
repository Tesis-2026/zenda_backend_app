import { Injectable } from '@nestjs/common';
import { ConversationEntity } from '../../domain/conversation.entity';
import { IConversationRepository } from '../../domain/ports/conversation.repository';

@Injectable()
export class GetActiveConversationUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  /** Returns the user's active conversation with its history, or null if none exists. */
  execute(userId: string): Promise<ConversationEntity | null> {
    return this.repo.findActiveByUserId(userId);
  }
}
