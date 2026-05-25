import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChatMessageEntity, ConversationEntity } from '../../domain/conversation.entity';

export class SendChatMessageDto {
  @ApiProperty({ description: 'The new user message to send to the assistant', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}

export class ChatMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @ApiProperty()
  content!: string;

  @ApiProperty({ description: 'ISO-8601 timestamp' })
  createdAt!: string;

  static from(message: ChatMessageEntity): ChatMessageResponseDto {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }
}

export class ActiveConversationResponseDto {
  @ApiProperty({ type: String, nullable: true, description: 'null when the user has no active conversation' })
  conversationId!: string | null;

  @ApiProperty({ type: [ChatMessageResponseDto] })
  messages!: ChatMessageResponseDto[];

  static from(conversation: ConversationEntity | null): ActiveConversationResponseDto {
    return {
      conversationId: conversation?.id ?? null,
      messages: conversation?.messages.map(ChatMessageResponseDto.from) ?? [],
    };
  }
}

export class ChatReplyResponseDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ description: 'The assistant reply' })
  reply!: string;
}
