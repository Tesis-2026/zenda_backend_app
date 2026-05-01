import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { AnalyticsService } from '../../../../infra/analytics/analytics.service';

export interface RegisterCommand {
  email: string;
  password: string;
  fullName: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  async execute(cmd: RegisterCommand): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.userRepository.findByEmail(cmd.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(cmd.password, rounds);

    const user = await this.userRepository.create({
      email: cmd.email,
      passwordHash,
      fullName: cmd.fullName,
    });

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    const refreshToken = await this._issueRefreshToken(user.id);

    this.analytics.track(user.id, 'register');

    return { accessToken, refreshToken };
  }

  private async _issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(40).toString('hex');
    const days = this.config.get<number>('auth.refreshTokenExpiresDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({ userId, token, expiresAt });
    return token;
  }
}
