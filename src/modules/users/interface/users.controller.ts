import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
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
}
