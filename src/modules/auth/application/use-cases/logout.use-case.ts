import { Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  /** Revokes all refresh tokens for the given user (full sign-out). */
  async execute(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteByUserId(userId);
  }
}
