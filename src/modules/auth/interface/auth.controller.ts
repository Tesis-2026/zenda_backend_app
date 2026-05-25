import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiAuthErrors,
  ApiConflictError,
  ApiCreated,
  ApiNoContent,
  ApiNotFoundError,
  ApiOk,
  ApiValidationError,
} from '../../../shared/swagger/api-responses.decorator';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../shared/swagger/api-error.response.dto';
import { AnalyticsService } from '../../../infra/analytics/analytics.service';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { RefreshAccessTokenUseCase } from '../application/use-cases/refresh-access-token.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { SendOtpUseCase } from '../application/use-cases/send-otp.use-case';
import { VerifyOtpUseCase } from '../application/use-cases/verify-otp.use-case';
import { JwtAuthGuard } from '../infrastructure/jwt-auth.guard';
import { UserId } from './decorators/user-id.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthTokenResponseDto } from './dto/auth-token.response.dto';
import { LoginErrorResponseDto } from './dto/login-error.response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly sendOtpUseCase: SendOtpUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user — returns access + refresh tokens' })
  @ApiCreated(AuthTokenResponseDto, 'User created and signed in')
  @ApiValidationError()
  @ApiConflictError('Email already registered')
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  async register(@Body() dto: RegisterDto): Promise<AuthTokenResponseDto> {
    const { userId, accessToken, refreshToken } =
      await this.registerUseCase.execute(dto);
    this.analytics.track(userId, 'register');
    return { accessToken, refreshToken };
  }

  @Post('login')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Login — returns access + refresh tokens (locks after 3 failures)' })
  @ApiCreated(AuthTokenResponseDto, 'Signed in')
  @ApiValidationError()
  @ApiResponse({
    status: 401,
    description:
      'Invalid credentials or account locked. Body carries `failedAttempts`, `attemptsRemaining`, `lockedUntil` so the client can render a server-authoritative lockout countdown (B14).',
    type: LoginErrorResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  async login(@Body() dto: LoginDto): Promise<AuthTokenResponseDto> {
    const { userId, accessToken, refreshToken } =
      await this.loginUseCase.execute(dto);
    this.analytics.track(userId, 'login');
    return { accessToken, refreshToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new access + refresh token pair' })
  @ApiOk(AuthTokenResponseDto, 'New token pair issued; old refresh token is rotated')
  @ApiValidationError()
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired', type: ApiErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponseDto> {
    return this.refreshAccessTokenUseCase.execute(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh tokens for the authenticated user' })
  @ApiNoContent('Refresh tokens revoked')
  @ApiAuthErrors()
  async logout(@UserId() userId: string): Promise<void> {
    await this.logoutUseCase.execute(userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset email (link-based — legacy)' })
  @ApiNoContent('Email enqueued (does not disclose whether the address is registered)')
  @ApiValidationError()
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.forgotPasswordUseCase.execute(dto.email);
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a 6-digit OTP code for password reset (VERIF-01)' })
  @ApiNoContent('OTP enqueued')
  @ApiValidationError()
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  async sendOtp(@Body() dto: SendOtpDto): Promise<void> {
    await this.sendOtpUseCase.execute(dto.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP code — returns a resetToken for use with reset-password (VERIF-01)' })
  @ApiResponse({ status: 200, description: 'OTP valid; reset token issued' })
  @ApiValidationError()
  @ApiResponse({ status: 401, description: 'OTP invalid or expired', type: ApiErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    return this.verifyOtpUseCase.execute(dto.email, dto.code);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using token from email or verify-otp' })
  @ApiNoContent('Password updated; all existing sessions revoked')
  @ApiValidationError()
  @ApiNotFoundError('Reset token invalid or expired')
  @ApiResponse({ status: 429, description: 'Too Many Requests', type: ApiErrorResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute({ token: dto.token, newPassword: dto.newPassword });
  }
}
