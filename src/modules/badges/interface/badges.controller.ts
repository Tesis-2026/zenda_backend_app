import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiOk } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { IBadgeRepository } from '../domain/ports/badge.repository';
import { BadgeResponseDto } from './dto/badge.response.dto';

@ApiTags('Badges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgesController {
  constructor(private readonly repo: IBadgeRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all badges with earned status (US-1003)' })
  @ApiOk(BadgeResponseDto, 'List of badges with per-user earned status')
  @ApiAuthErrors()
  async list(@UserId() userId: string): Promise<BadgeResponseDto[]> {
    const badges = await this.repo.list(userId);
    return badges.map(BadgeResponseDto.from);
  }
}
