import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiMessageRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAuthErrors,
  ApiNoContent,
  ApiOk,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetActiveConversationUseCase } from '../application/use-cases/get-active-conversation.use-case';
import { SendChatMessageUseCase } from '../application/use-cases/send-chat-message.use-case';
import { CloseActiveConversationUseCase } from '../application/use-cases/close-active-conversation.use-case';
import {
  ActiveConversationResponseDto,
  ChatReplyResponseDto,
  SendChatMessageDto,
  SubmitChatFeedbackDto,
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
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('active')
  @ApiOperation({
    summary: 'Get the active AI chat conversation with its message history',
  })
  @ApiOk(
    ActiveConversationResponseDto,
    'Active conversation + ordered messages',
  )
  @ApiAuthErrors()
  async active(
    @UserId() userId: string,
  ): Promise<ActiveConversationResponseDto> {
    const conversation = await this.getActiveConversation.execute(userId);
    return ActiveConversationResponseDto.from(conversation);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Send a message to the Zenda AI assistant — appends to the active conversation',
  })
  @ApiOk(ChatReplyResponseDto, 'Assistant reply')
  @ApiValidationError()
  @ApiAuthErrors()
  send(
    @UserId() userId: string,
    @Body() dto: SendChatMessageDto,
  ): Promise<ChatReplyResponseDto> {
    if (dto.userId && dto.userId !== userId) {
      throw new ForbiddenException(
        'No puedes enviar mensajes para otro usuario',
      );
    }
    this.analytics.track(userId, 'chat_message_sent', {
      messageLength: dto.message.length,
    });
    return this.sendChatMessage.execute(userId, dto.message);
  }

  @Post('messages/:id/feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Evaluate a persisted assistant answer for research analysis',
  })
  @ApiResponse({ status: 201, description: 'Feedback accepted' })
  @ApiValidationError()
  @ApiAuthErrors()
  async feedback(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body() dto: SubmitChatFeedbackDto,
  ): Promise<{ accepted: true }> {
    const message = await this.prisma.aiMessage.findFirst({
      where: {
        id: messageId,
        role: AiMessageRole.ASSISTANT,
        conversation: { userId },
      },
      select: { id: true },
    });

    if (!message) {
      throw new NotFoundException('Assistant message not found');
    }

    await this.prisma.aiMessage.update({
      where: { id: messageId },
      data: {
        feedbackRating: dto.rating,
        feedbackHelpful: dto.helpful ?? null,
        feedbackClear: dto.clear ?? null,
        feedbackPersonalized: dto.personalized ?? null,
        feedbackComment: dto.comment?.trim() || null,
        feedbackAt: new Date(),
      },
    });

    this.analytics.track(userId, 'ai_answer_feedback', {
      messageId,
      rating: dto.rating,
      helpful: dto.helpful ?? null,
      clear: dto.clear ?? null,
      personalized: dto.personalized ?? null,
      commentLength: dto.comment?.trim().length ?? 0,
    });

    return { accepted: true };
  }

  @Post('close')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Close the active conversation — messages are retained',
  })
  @ApiNoContent('Conversation closed')
  @ApiAuthErrors()
  async close(@UserId() userId: string): Promise<void> {
    await this.closeActiveConversation.execute(userId);
  }
}
