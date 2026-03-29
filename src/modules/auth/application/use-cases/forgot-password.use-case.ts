import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IPasswordResetTokenRepository } from '../../domain/ports/password-reset-token.repository';
import { EmailService } from '../../../../common/email/email.service';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Silently succeed if user not found — prevents email enumeration
    if (!user) return;

    // Invalidate any existing tokens for this user
    await this.tokenRepository.deleteByUserId(user.id);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.tokenRepository.create({ userId: user.id, token, expiresAt });
    await this.emailService.sendPasswordResetEmail(user.email, token);
  }
}
