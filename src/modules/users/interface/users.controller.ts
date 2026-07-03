import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiNoContent, ApiOk, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case';
import { ExportUserDataUseCase } from '../application/use-cases/export-user-data.use-case';
import { AnonymizeAccountUseCase } from '../application/use-cases/anonymize-account.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile.response.dto';
import { UserDataExportResponseDto } from './dto/user-data-export.response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly exportUserDataUseCase: ExportUserDataUseCase,
    private readonly anonymizeAccountUseCase: AnonymizeAccountUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOk(UserProfileResponseDto, 'Authenticated user profile')
  @ApiAuthErrors()
  async getMe(@UserId() userId: string): Promise<UserProfileResponseDto> {
    return this.getProfileUseCase.execute(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOk(UserProfileResponseDto, 'Updated profile')
  @ApiValidationError()
  @ApiAuthErrors()
  async updateMe(
    @UserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.updateProfileUseCase.execute(userId, dto);
  }

  @Get('me/export')
  @ApiOperation({ summary: 'Export own personal data as JSON (Ley 29733 access/portability evidence)' })
  @ApiOk(UserDataExportResponseDto, 'Portable user data export without passwords or auth secrets')
  @ApiAuthErrors()
  async exportMe(@UserId() userId: string): Promise<UserDataExportResponseDto> {
    return this.exportUserDataUseCase.execute(userId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Anonymize and logically delete own account (Ley 29733 data minimization)' })
  @ApiNoContent('Account anonymized, sessions revoked, and user marked as deleted')
  @ApiAuthErrors()
  async deleteMe(@UserId() userId: string): Promise<void> {
    await this.anonymizeAccountUseCase.execute(userId);
  }
}
