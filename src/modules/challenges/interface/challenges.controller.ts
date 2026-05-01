import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { IChallengeRepository } from '../domain/ports/challenge.repository';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { ChallengeResponseDto } from './dto/challenge.response.dto';

@ApiTags('Challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly repo: IChallengeRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all challenges with user status (US-1002)' })
  async list(@UserId() userId: string): Promise<ChallengeResponseDto[]> {
    const challenges = await this.repo.list(userId);
    return challenges.map(ChallengeResponseDto.from);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a challenge (US-1002)' })
  async accept(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<ChallengeResponseDto> {
    const challenge = await this.repo.accept(id, userId);
    this.analytics.track(userId, 'accept_challenge', { challengeId: id });
    return ChallengeResponseDto.from(challenge);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a challenge as completed (US-1002)' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @UserId() userId: string): Promise<ChallengeResponseDto> {
    const challenge = await this.repo.complete(id, userId);
    this.analytics.track(userId, 'complete_challenge', { challengeId: id });
    return ChallengeResponseDto.from(challenge);
  }
}
