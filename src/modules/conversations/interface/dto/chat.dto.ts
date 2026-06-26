import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { sanitizeAgentVisibleCitations } from '../../../../infra/ai/azure-foundry-agent.client';
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
      content:
        message.role === 'assistant'
          ? sanitizeAgentVisibleCitations(message.content)
          : message.content,
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

  @ApiProperty({
    description:
      'Persisted assistant message id, used to evaluate the AI answer',
  })
  assistantMessageId!: string;

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

export class SubmitChatFeedbackDto {
  @ApiProperty({
    description: 'User rating for the assistant answer, from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Whether the answer was useful' })
  @IsOptional()
  @IsBoolean()
  helpful?: boolean;

  @ApiPropertyOptional({ description: 'Whether the answer was clear' })
  @IsOptional()
  @IsBoolean()
  clear?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the answer felt personalized to the user context',
  })
  @IsOptional()
  @IsBoolean()
  personalized?: boolean;

  @ApiPropertyOptional({
    description: 'Optional qualitative comment for the research pilot',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
