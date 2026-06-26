import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../modules/auth/interface/decorators/user-id.decorator';
import {
  ApiAuthErrors,
  ApiValidationError,
} from '../../shared/swagger/api-responses.decorator';
import { AnalyticsService } from './analytics.service';
import { TrackAnalyticsEventDto } from './dto/track-analytics-event.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Track a mobile research/usage analytics event' })
  @ApiResponse({ status: 202, description: 'Event accepted' })
  @ApiValidationError()
  @ApiAuthErrors()
  async track(
    @UserId() userId: string,
    @Body() dto: TrackAnalyticsEventDto,
  ): Promise<{ accepted: true }> {
    await this.analytics.trackAsync(userId, dto.eventType, dto.metadata);
    return { accepted: true };
  }
}
