import { Injectable } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository';

@Injectable()
export class CloseActiveConversationUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  /**
   * Closes the user's active conversation (e.g. on logout). Messages are retained
   * in the database — the conversation is simply marked CLOSED and no longer resumable.
   */
  execute(userId: string): Promise<void> {
    return this.repo.closeActiveByUserId(userId);
  }
}
