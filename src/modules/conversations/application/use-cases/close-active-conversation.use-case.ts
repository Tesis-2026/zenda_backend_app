import { Injectable } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository';

@Injectable()
export class CloseActiveConversationUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  /**
   * Closes the user's active conversation when the user explicitly wants a
   * fresh chat. Messages are retained and can still be reopened later.
   */
  execute(userId: string): Promise<void> {
    return this.repo.closeActiveByUserId(userId);
  }
}
