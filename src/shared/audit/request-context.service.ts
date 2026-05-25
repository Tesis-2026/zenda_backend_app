import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request context captured by `RequestContextInterceptor` and read
 * by `AuditLogService` (and anything else that needs request metadata
 * without threading it through every method signature).
 *
 * Uses AsyncLocalStorage so the use case layer stays HTTP-agnostic.
 */
export type RequestContext = {
  requestId: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  httpMethod: string;
  httpPath: string;
};

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContext>();

  /**
   * Runs `callback` with the given context bound for the duration of
   * its async tree. The interceptor calls this once per request.
   */
  run<T>(context: RequestContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  /** Returns the current request's context, or null when called outside a request scope (e.g. cron). */
  get(): RequestContext | null {
    return this.als.getStore() ?? null;
  }
}
