import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatMessageEntity, ConversationEntity } from '../../domain/conversation.entity';

export class SendChatMessageDto {
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'The new user message to send to the assistant',
    maxLength: 2000,
    example: 'Gasto mucho en delivery, ¿qué hago?',
  })
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

export class ChatSourceResponseDto {
  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  fileId?: string;

  @ApiPropertyOptional()
  quote?: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  text?: string;
}

export class ChatReplyResponseDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ description: 'The assistant reply' })
  reply!: string;

  @ApiProperty({ description: 'Same assistant answer exposed for the RAG contract' })
  answer!: string;

  @ApiProperty({ type: [ChatSourceResponseDto] })
  sources!: ChatSourceResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      agent: { type: 'string', example: 'ZENDA' },
      usedRag: { type: 'boolean', example: true },
      mode: { type: 'string', enum: ['foundry_agent', 'classic_assistant'], example: 'foundry_agent' },
      runId: { type: 'string', nullable: true },
      threadId: { type: 'string', nullable: true },
      responseId: { type: 'string', nullable: true },
      remoteConversationId: { type: 'string', nullable: true },
    },
  })
  metadata!: {
    agent: string;
    usedRag: boolean;
    mode?: 'foundry_agent' | 'classic_assistant';
    runId?: string;
    threadId?: string;
    responseId?: string;
    remoteConversationId?: string;
  };
}
