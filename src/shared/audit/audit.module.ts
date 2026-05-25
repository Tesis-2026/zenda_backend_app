import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { RequestContextService } from './request-context.service';

/**
 * Cross-cutting module for audit-trail writes (B27 / ARCH-26) and the
 * request-context store backing them (also reusable by any feature
 * that needs request metadata without HTTP coupling).
 *
 * Global so use cases anywhere can inject `AuditLogService` without
 * each module having to import this one.
 */
@Global()
@Module({
  providers: [RequestContextService, AuditLogService],
  exports: [RequestContextService, AuditLogService],
})
export class AuditModule {}
