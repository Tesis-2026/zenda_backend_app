import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference.response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'List notification preferences for the current user (US-1104)' })
  async getPreferences(@UserId() userId: string): Promise<NotificationPreferenceResponseDto[]> {
    const existing = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const existingMap = new Map(existing.map((p) => [p.type, p.enabled]));

    return Object.values(NotificationType).map((type) => ({
      type,
      enabled: existingMap.get(type) ?? true,
    }));
  }

  @Patch('preferences/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable or disable a notification type (US-1104)' })
  async updatePreference(
    @UserId() userId: string,
    @Param('type') type: string,
    @Body() dto: UpdatePreferenceDto,
  ): Promise<void> {
    const notificationType = type as NotificationType;
    await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type: notificationType } },
      create: { userId, type: notificationType, enabled: dto.enabled },
      update: { enabled: dto.enabled },
    });
  }
}
