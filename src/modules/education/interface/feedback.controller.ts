import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedbackType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit app feedback (US-1501)' })
  async create(@UserId() userId: string, @Body() dto: CreateFeedbackDto): Promise<{ id: string }> {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: (dto.type as FeedbackType) ?? FeedbackType.GENERAL,
        message: dto.message,
        screenName: dto.screenName,
        rating: dto.rating,
      },
    });

    this.analytics.track(userId, 'submit_feedback', { type: dto.type, rating: dto.rating });

    return { id: feedback.id };
  }
}
