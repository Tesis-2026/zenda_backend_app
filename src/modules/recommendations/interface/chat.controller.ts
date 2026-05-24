import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetActiveConversationUseCase } from '../application/use-cases/get-active-conversation.use-case';
import { SendChatMessageUseCase } from '../application/use-cases/send-chat-message.use-case';
import { CloseActiveConversationUseCase } from '../application/use-cases/close-active-conversation.use-case';
import {
  ActiveConversationResponseDto,
  ChatReplyResponseDto,
  SendChatMessageDto,
} from './dto/chat.dto';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/chat')
export class ChatController {
  constructor(
    private readonly getActiveConversation: GetActiveConversationUseCase,
    private readonly sendChatMessage: SendChatMessageUseCase,
    private readonly closeActiveConversation: CloseActiveConversationUseCase,
  ) {}

  @Get('active')
  @ApiOperation({ summary: 'Get the active AI chat conversation with its message history' })
  async active(@UserId() userId: string): Promise<ActiveConversationResponseDto> {
    const conversation = await this.getActiveConversation.execute(userId);
    return ActiveConversationResponseDto.from(conversation);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message to the Zenda AI assistant — appends to the active conversation' })
  send(@UserId() userId: string, @Body() dto: SendChatMessageDto): Promise<ChatReplyResponseDto> {
    return this.sendChatMessage.execute(userId, dto.message);
  }

  @Post('close')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Close the active conversation (e.g. on logout) — messages are retained' })
  async close(@UserId() userId: string): Promise<void> {
    await this.closeActiveConversation.execute(userId);
  }
}
