import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { AI_PROVIDER } from '../../infra/ai/ai.module';
import { AiProvider } from '../../infra/ai/AiProvider';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class ChatController {
  constructor(@Inject(AI_PROVIDER) private readonly ai: AiProvider) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a message to Zenda AI assistant (US-0037)' })
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    const reply = await this.ai.chat(dto.messages);
    return { reply };
  }
}
