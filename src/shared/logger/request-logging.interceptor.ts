import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
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

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithMetadata>();
    const startedAt = Date.now();

    if (!request.requestId) {
      request.requestId = randomUUID();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(
            JSON.stringify({
              requestId: request.requestId,
              method: request.method,
              path: request.url,
              userId: request.user?.sub,
              durationMs,
            }),
            'HTTP',
          );
        },
      }),
    );
  }
}