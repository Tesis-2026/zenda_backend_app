import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { RequestContextService } from './request-context.service';

type RequestUser = { sub?: string };
type RequestWithMetadata = Request & {
  requestId?: string;
  user?: RequestUser;
};

/**
 * Captures HTTP context (requestId, userId from JWT, ip, user-agent,
 * method, path) once per request and binds it to the AsyncLocalStorage
 * scope so downstream code (use cases, audit log writer, etc.) can
 * read it without changing their method signatures.
 *
 * Order: this interceptor must run BEFORE any interceptor that wants
 * to read context (e.g. the audit log writer). NestJS runs interceptors
 * in REVERSE registration order, so register this LAST in app.module.ts.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(execContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = execContext.switchToHttp();
    const request = http.getRequest<RequestWithMetadata>();

    if (!request.requestId) {
      request.requestId = randomUUID();
    }

    const ipAddress =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      request.socket?.remoteAddress ??
      null;

    const ctx = {
      requestId: request.requestId,
      userId: request.user?.sub ?? null,
      ipAddress,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
      httpMethod: request.method,
      httpPath: request.url,
    };

    return new Observable((subscriber) => {
      this.context.run(ctx, () => {
        const subscription = next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
        return () => subscription.unsubscribe();
      });
    });
  }
}
