import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../auth/interface/decorators/user-id.decorator';
import { AI_PROVIDER } from '../../infra/ai/ai.module';
import { AiProvider, UserProfile } from '../../infra/ai/AiProvider';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class ChatController {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a message to Zenda AI assistant (US-0037)' })
  async chat(@UserId() userId: string, @Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    const userRow = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { financialLiteracyLevel: true, age: true, university: true, incomeType: true, averageMonthlyIncome: true },
    });
    const userProfile: UserProfile = {
      financialLiteracyLevel: (userRow?.financialLiteracyLevel as UserProfile['financialLiteracyLevel']) ?? null,
      age: userRow?.age ?? null,
      university: userRow?.university ?? null,
      incomeType: userRow?.incomeType ?? null,
      averageMonthlyIncome: userRow?.averageMonthlyIncome?.toNumber() ?? null,
    };

    const reply = await this.ai.chat(dto.messages, userProfile);
    return { reply };
  }
}
