import { ChatMessageEntity, ChatRole, ConversationEntity } from '../conversation.entity';
import { UserProfile } from '../../../../infra/ai/AiProvider';

export abstract class IConversationRepository {
  /** Returns the user's ACTIVE conversation with its messages, or null if none exists. */
  abstract findActiveByUserId(userId: string): Promise<ConversationEntity | null>;

  /** Returns the user's ACTIVE conversation, creating an empty one if none exists. */
  abstract getOrCreateActive(userId: string): Promise<ConversationEntity>;

  /** Appends a message to a conversation and returns the persisted message. */
  abstract appendMessage(conversationId: string, role: ChatRole, content: string): Promise<ChatMessageEntity>;

  /** Closes every ACTIVE conversation for the user (status → CLOSED, endedAt → now). */
  abstract closeActiveByUserId(userId: string): Promise<void>;

  /** Builds the AI UserProfile from the user's stored profile fields. */
  abstract getUserProfile(userId: string): Promise<UserProfile>;
}
