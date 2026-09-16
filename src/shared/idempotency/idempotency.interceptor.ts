import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const MAX_KEY_LENGTH = 128;
const KEY_PATTERN = /^[A-Za-z0-9_\-.:]+$/;

type RequestWithUser = Request & {
  user?: { sub?: string };
};

// Reserve the unique database key before side effects on any instance.
// Ambiguous failures keep their reservation for manual reconciliation.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();

    if (!IDEMPOTENCY_METHODS.has(request.method)) {
      return next.handle();
    }

    const headerValue = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!key) return next.handle();

    if (
      key.length === 0 ||
      key.length > MAX_KEY_LENGTH ||
      !KEY_PATTERN.test(key)
    ) {
      throw new BadRequestException(
        `Idempotency-Key must be 1-${MAX_KEY_LENGTH} chars of [A-Za-z0-9_-.:].`,
      );
    }

    const userId = request.user?.sub;
    if (!userId) {
      // Unauthenticated routes don't get idempotency. We just skip
      // rather than 401 because the route itself decides auth.
      return next.handle();
    }

    const requestHash = this.idempotency.computeRequestHash(
      request.method,
      request.url,
      (request as { body?: unknown }).body,
    );

    return from(this.idempotency.claim({ key, userId, requestHash })).pipe(
      switchMap((cached) => {
        if (cached) {
          response.status(cached.statusCode);
          response.setHeader('Idempotency-Replayed', 'true');
          return of(cached.body);
        }

        return next.handle().pipe(
          switchMap(async (body: unknown) => {
            await this.idempotency.store({
              key,
              userId,
              requestHash,
              statusCode: response.statusCode,
              body,
            });
            return body;
          }),
        );
      }),
    );
  }
}
