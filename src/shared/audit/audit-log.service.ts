import { Injectable, Logger } from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RequestContextService } from './request-context.service';

export type AuditRecordInput = {
  action: string; // e.g. 'CREATE_TRANSACTION', 'RESET_PASSWORD', 'LOGIN_FAILED'
  resource: string; // e.g. 'Transaction', 'User'
  resourceId?: string | null;
  status?: AuditStatus;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadata?: unknown;
  /**
   * Overrides for the userId / ipAddress read from the request context.
   * Use ONLY when calling from a place where the request context is not
   * yet populated (e.g. inside LoginUseCase, where the JWT guard has
   * not run and we still want to record the actor).
   */
  userIdOverride?: string | null;
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'otp',
  'code',
]);

/**
 * Singleton, fire-and-forget writer for the `AuditLog` table.
 *
 *   - Reads HTTP context (requestId, userId, ip, etc.) from the
 *     AsyncLocalStorage scope populated by `RequestContextInterceptor`.
 *     Falls back gracefully when called outside a request scope (e.g.
 *     a cron job).
 *
 *   - Sanitizes the before/after JSON to drop common secret-bearing
 *     keys (password, hashed values, tokens, codes). Add to
 *     SENSITIVE_KEYS as needed.
 *
 *   - Writes are NOT awaited from the caller's perspective: a failed
 *     audit write logs locally but never propagates an exception to
 *     the business path. Audit logs are observability; a missing one
 *     is bad but not as bad as failing a user-facing request.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Records an audit event. Fire-and-forget — callers do not need to
   * await it. Returns void so callers don't accidentally try.
   */
  record(input: AuditRecordInput): void {
    const ctx = this.requestContext.get();
    const userId = input.userIdOverride ?? ctx?.userId ?? null;

    const data: Prisma.AuditLogUncheckedCreateInput = {
      userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      status: input.status ?? AuditStatus.SUCCESS,
      requestId: ctx?.requestId ?? null,
      httpMethod: ctx?.httpMethod ?? null,
      httpPath: ctx?.httpPath ?? null,
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
      beforeJson: this.toJson(input.beforeJson),
      afterJson: this.toJson(input.afterJson),
      metadata: this.toJson(input.metadata),
    };

    // Fire-and-forget. We catch and log locally so a DB hiccup never
    // takes down the user-facing request.
    void this.prisma.auditLog
      .create({ data })
      .catch((err) => this.logger.warn(`audit write failed: ${err instanceof Error ? err.message : String(err)}`));
  }

  private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) return Prisma.JsonNull;
    return this.redact(value) as Prisma.InputJsonValue;
  }

  private redact(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => this.redact(v));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '***' : this.redact(v);
    }
    return out;
  }
}
