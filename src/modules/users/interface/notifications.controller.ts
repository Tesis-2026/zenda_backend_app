import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import {
  ApiAuthErrors,
  ApiNoContent,
  ApiOk,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetNotificationPreferencesUseCase } from '../application/use-cases/get-notification-preferences.use-case';
import { UpdateNotificationPreferenceUseCase } from '../application/use-cases/update-notification-preference.use-case';
import { isNotificationType } from '../domain/notification-preference';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference.response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getPreferences: GetNotificationPreferencesUseCase,
    private readonly updatePreferenceUseCase: UpdateNotificationPreferenceUseCase,
  ) {}

  @Get('preferences')
  @ApiOperation({ summary: 'List notification preferences for the current user (US-1104)' })
  @ApiOk(NotificationPreferenceResponseDto, 'Per-type opt-in/out (missing keys default to true)')
  @ApiAuthErrors()
  async list(@UserId() userId: string): Promise<NotificationPreferenceResponseDto[]> {
    const prefs = await this.getPreferences.execute(userId);
    return prefs.map((p) => ({ type: p.type, enabled: p.enabled }));
  }

  @Patch('preferences/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable or disable a notification type (US-1104)' })
  @ApiNoContent('Preference updated')
  @ApiValidationError()
  @ApiAuthErrors()
  async update(
    @UserId() userId: string,
    @Param('type') type: string,
    @Body() dto: UpdatePreferenceDto,
  ): Promise<void> {
    // Validated here (and not in a DTO) because `type` is a path param —
    // class-validator wouldn't run unless we reshape it into a DTO. Cheap
    // guard avoids leaking an unknown key into the JSON blob.
    if (!isNotificationType(type)) {
      throw new BadRequestException(`Unknown notification type: ${type}`);
    }
    await this.updatePreferenceUseCase.execute(userId, type as NotificationType, dto.enabled);
  }
}
