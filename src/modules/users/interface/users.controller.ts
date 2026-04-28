import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile.response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@UserId() userId: string): Promise<UserProfileResponseDto> {
    return this.getProfileUseCase.execute(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @UserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.updateProfileUseCase.execute(userId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own account and all associated data (US-1306)' })
  async deleteMe(@UserId() userId: string, @Req() req: Request): Promise<void> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      null;

    await this.prisma.$transaction([
      // Audit the deletion before cascades remove the user row
      this.prisma.auditLog.create({
        data: { userId, action: 'DELETE_ACCOUNT', resource: 'User', ipAddress },
      }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
