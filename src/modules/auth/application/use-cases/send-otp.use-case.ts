import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IPasswordResetOtpRepository } from '../../domain/ports/password-reset-otp.repository';
import { EmailService } from '../../../../infra/email/email.service';

const OTP_EXPIRY_MINUTES = 15;

@Injectable()
export class SendOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IPasswordResetOtpRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) return; // Silent — prevents email enumeration

    await this.otpRepository.deleteByUserId(user.id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpRepository.create({ userId: user.id, email: email.toLowerCase(), code, expiresAt });
    await this.emailService.sendOtpEmail(user.email, code);
  }
}
