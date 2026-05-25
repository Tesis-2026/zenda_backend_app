import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of, tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const MAX_KEY_LENGTH = 128;
const KEY_PATTERN = /^[A-Za-z0-9_\-.:]+$/;

type RequestWithUser = Request & {
  user?: { sub?: string };
};

/**
 * Global interceptor that implements the RFC-draft "Idempotency-Key"
 * HTTP header field (https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-06.html).
 *
 *   - Idempotency is OPT-IN per request: the interceptor is a no-op
 *     when the header is absent.
 *   - Only POST/PUT/PATCH are considered; GET/HEAD/OPTIONS are already
 *     idempotent at the protocol level.
 *   - Only authenticated requests can dedup — we scope keys by userId
 *     so two users can't poison each other's keyspace.
 *   - The cached body and status are replayed on a hash match. On a
 *     mismatch (same key, different body) the service throws 409.
 *
 * ## Known limitation — concurrent duplicate requests
 *
 * This is "idempotency-by-response", same pattern Stripe/Twilio/AWS use.
 * Two truly-concurrent requests with the same Idempotency-Key both miss
 * the lookup, both execute the handler, then both try to persist the
 * cache row — the @@unique([key, userId]) constraint stops the second
 * insert, but the side effect (e.g. duplicate transaction) has already
 * occurred twice.
 *
 * Mitigations available but NOT implemented:
 *   - Insert-first-then-execute with a "pending" row + distributed lock.
 *     Adds complexity (stuck pending rows on handler crash) without
 *     fully solving the problem.
 *   - Application-level dedup keys (e.g. a UNIQUE constraint on the
 *     business object itself).
 *
 * Accepted for this codebase because:
 *   - Mobile retries happen seconds apart, not microseconds → race
 *     window is small in practice.
 *   - Single-in-flight-per-key in well-behaved clients.
 *   - The duplicate side-effect risk is the same risk that exists
 *     without idempotency at all — this interceptor strictly reduces
 *     it, never amplifies it.
 */
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

    if (key.length === 0 || key.length > MAX_KEY_LENGTH || !KEY_PATTERN.test(key)) {
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

    return from(this.idempotency.lookup({ key, userId, requestHash })).pipe(
      switchMap((cached) => {
        if (cached) {
          response.status(cached.statusCode);
          response.setHeader('Idempotency-Replayed', 'true');
          return of(cached.body);
        }

        return next.handle().pipe(
          tap({
            next: (body: unknown) => {
              // Fire-and-forget: don't block the response on persistence,
              // but log errors so we notice a broken cache.
              void this.idempotency
                .store({
                  key,
                  userId,
                  requestHash,
                  statusCode: response.statusCode,
                  body,
                })
                .catch(() => {
                  // Swallow: a write failure shouldn't fail the request.
                  // Subsequent retries will simply re-run the handler.
                });
            },
          }),
        );
      }),
    );
  }
}
