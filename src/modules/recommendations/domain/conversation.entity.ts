export type ConversationStatus = 'ACTIVE' | 'CLOSED';
export type ChatRole = 'user' | 'assistant';

export class ChatMessageEntity {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly role: ChatRole,
    public readonly content: string,
    public readonly createdAt: Date,
  ) {}
}

export class ConversationEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly status: ConversationStatus,
    public readonly startedAt: Date,
    public readonly endedAt: Date | null,
    public readonly messages: ChatMessageEntity[],
  ) {}
}
