import { Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Revokes all refresh tokens for the given user (full sign-out). */
  async execute(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteByUserId(userId);
    this.auditLog.record({
      action: 'LOGOUT',
      resource: 'User',
      resourceId: userId,
    });
  }
}
