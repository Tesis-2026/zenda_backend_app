import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    incomingToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const record = await this.refreshTokenRepository.findByToken(incomingToken);

    if (!record || record.expiresAt < new Date()) {
      // Delete stale record if it exists
      if (record) await this.refreshTokenRepository.deleteByToken(incomingToken);
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) {
      await this.refreshTokenRepository.deleteByToken(incomingToken);
      throw new UnauthorizedException('User not found');
    }

    // Rotate: delete old token before issuing new one
    await this.refreshTokenRepository.deleteByToken(incomingToken);

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    const newRawToken = randomBytes(40).toString('hex');
    const days = this.config.get<number>('auth.refreshTokenExpiresDays') ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create({
      userId: user.id,
      token: newRawToken,
      expiresAt,
    });

    return { accessToken, refreshToken: newRawToken };
  }
}
