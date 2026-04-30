import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository';
import { IPasswordResetTokenRepository } from '../../domain/ports/password-reset-token.repository';

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    private readonly otpRepository: IPasswordResetOtpRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
  ) {}

  async execute(email: string, code: string): Promise<{ resetToken: string }> {
    const otp = await this.otpRepository.findValid(email.toLowerCase(), code);
    if (!otp) {
      throw new BadRequestException('Invalid or expired code.');
    }

    await this.otpRepository.markUsed(otp.id);

    // Issue a standard reset token so the existing reset-password endpoint handles the rest
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.tokenRepository.deleteByUserId(otp.userId);
    await this.tokenRepository.create({ userId: otp.userId, token, expiresAt });

    return { resetToken: token };
  }
}
