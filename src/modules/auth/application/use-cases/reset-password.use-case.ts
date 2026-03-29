import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { IPasswordResetTokenRepository } from '../../domain/ports/password-reset-token.repository';
import { IUserRepository } from '../../domain/ports/user.repository';

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly userRepository: IUserRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(cmd: ResetPasswordCommand): Promise<void> {
    const record = await this.tokenRepository.findByToken(cmd.token);

    if (!record) {
      throw new NotFoundException('Invalid or expired reset token');
    }
    if (record.usedAt !== null) {
      throw new BadRequestException('Reset token has already been used');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(cmd.newPassword, rounds);

    await this.userRepository.updatePasswordHash(record.userId, passwordHash);
    await this.tokenRepository.markUsed(record.id);
  }
}
