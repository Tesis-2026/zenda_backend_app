import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiNoContent, ApiOk, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { NotificationType, Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference.response.dto';

type PrefsMap = Partial<Record<NotificationType, boolean>>;

function parsePrefs(raw: Prisma.JsonValue | null | undefined): PrefsMap {
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PrefsMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean' && (Object.values(NotificationType) as string[]).includes(key)) {
      out[key as NotificationType] = value;
    }
  }
  return out;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'List notification preferences for the current user (US-1104)' })
  @ApiOk(NotificationPreferenceResponseDto, 'Per-type opt-in/out (missing keys default to true)')
  @ApiAuthErrors()
  async getPreferences(@UserId() userId: string): Promise<NotificationPreferenceResponseDto[]> {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const prefs = parsePrefs(row.notificationPrefs);

    // Missing keys default to enabled — opt-out behavior preserved from the previous table.
    return Object.values(NotificationType).map((type) => ({
      type,
      enabled: prefs[type] ?? true,
    }));
  }

  @Patch('preferences/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable or disable a notification type (US-1104)' })
  @ApiNoContent('Preference updated')
  @ApiValidationError()
  @ApiAuthErrors()
  async updatePreference(
    @UserId() userId: string,
    @Param('type') type: string,
    @Body() dto: UpdatePreferenceDto,
  ): Promise<void> {
    const notificationType = type as NotificationType;
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const prefs = parsePrefs(row.notificationPrefs);
    prefs[notificationType] = dto.enabled;
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: prefs as Prisma.InputJsonValue },
    });
  }
}
