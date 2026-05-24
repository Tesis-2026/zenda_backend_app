import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';
import { AppLogger } from './app-logger.service';

type RequestUser = {
  sub?: string;
};

type RequestWithMetadata = Request & {
  requestId?: string;
  user?: RequestUser;
};

// Query-string keys whose VALUES should be masked before logging.
// Matches the parameter name case-insensitively.
const SENSITIVE_QUERY_KEYS = new Set(
  ['password', 'token', 'code', 'otp', 'secret', 'apikey', 'access_token', 'refresh_token']
    .map((k) => k.toLowerCase()),
);

// Replace the value of any sensitive query param with `***`.
// Preserves the rest of the URL so traces remain useful.
export function redactSensitiveQuery(url: string): string {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return url;

  const path = url.slice(0, queryIndex);
  const query = url.slice(queryIndex + 1);
  if (query.length === 0) return url;

  const parts = query.split('&').map((pair) => {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) return pair;
    const key = pair.slice(0, eqIndex);
    if (SENSITIVE_QUERY_KEYS.has(decodeURIComponent(key).toLowerCase())) {
      return `${key}=***`;
    }
    return pair;
  });

  return `${path}?${parts.join('&')}`;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithMetadata>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    if (!request.requestId) {
      request.requestId = randomUUID();
    }

    const emit = (status: number, error?: unknown) => {
      const durationMs = Date.now() - startedAt;
      const payload: Record<string, unknown> = {
        requestId: request.requestId,
        method: request.method,
        path: redactSensitiveQuery(request.url),
        status,
        userId: request.user?.sub,
        durationMs,
      };
      if (error instanceof Error) {
        payload.errorName = error.name;
        payload.errorMessage = error.message;
      }
      this.logger.log(JSON.stringify(payload), 'HTTP');
    };

    return next.handle().pipe(
      tap({
        next: () => emit(response.statusCode),
        error: (err: unknown) => {
          // For HttpException Nest sets the status before reaching here in
          // the global filter; we fall back to the response status if set,
          // otherwise mark as 500 (unhandled).
          const status = response.statusCode && response.statusCode >= 400
            ? response.statusCode
            : 500;
          emit(status, err);
        },
      }),
    );
  }
}
