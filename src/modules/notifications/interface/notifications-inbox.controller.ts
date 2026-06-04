import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { ListInboxUseCase } from '../application/use-cases/list-inbox.use-case';
import { MarkReadUseCase } from '../application/use-cases/mark-read.use-case';
import { RegisterFcmTokenUseCase } from '../application/use-cases/register-fcm-token.use-case';
import {
  NotificationInboxResponseDto,
  NotificationResponseDto,
} from './dto/notification.response.dto';
import {
  RegisterFcmTokenDto,
  SetDailyReminderTimeDto,
} from './dto/register-fcm-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsInboxController {
  constructor(
    private readonly listInbox: ListInboxUseCase,
    private readonly markRead: MarkReadUseCase,
    private readonly fcmToken: RegisterFcmTokenUseCase,
  ) {}

  @Get('inbox')
  @ApiOperation({
    summary: 'List recent notifications and unread count for the current user',
  })
  @ApiOkResponse({ type: NotificationInboxResponseDto })
  async getInbox(
    @UserId() userId: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationInboxResponseDto> {
    const parsedLimit = Math.max(1, Math.min(100, Number(limit ?? 50)));
    const result = await this.listInbox.execute(
      userId,
      parsedLimit,
      unreadOnly === 'true',
    );
    return {
      items: result.items.map((n) => NotificationResponseDto.from(n)),
      unreadCount: result.unreadCount,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async markOneRead(
    @UserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<NotificationResponseDto> {
    const updated = await this.markRead.execute(id, userId);
    return NotificationResponseDto.from(updated);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  @ApiOkResponse({ schema: { properties: { updated: { type: 'number' } } } })
  async markAll(@UserId() userId: string): Promise<{ updated: number }> {
    const updated = await this.markRead.markAll(userId);
    return { updated };
  }

  @Post('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register the device FCM token for push delivery' })
  @ApiNoContentResponse()
  async registerToken(
    @UserId() userId: string,
    @Body() dto: RegisterFcmTokenDto,
  ): Promise<void> {
    await this.fcmToken.register(userId, dto.token);
  }

  @Delete('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the device FCM token (e.g. on logout)' })
  @ApiNoContentResponse()
  async clearToken(@UserId() userId: string): Promise<void> {
    await this.fcmToken.unregister(userId);
  }

  @Patch('daily-reminder-time')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the local time when DAILY_REMINDER should fire' })
  @ApiNoContentResponse()
  async setDailyReminderTime(
    @UserId() userId: string,
    @Body() dto: SetDailyReminderTimeDto,
  ): Promise<void> {
    await this.fcmToken.setDailyReminderTime(userId, dto.time);
  }
}
