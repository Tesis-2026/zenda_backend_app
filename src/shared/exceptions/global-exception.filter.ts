import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

type NormalizedError = {
  statusCode: number;
  message: string | string[];
  error: string;
  /**
   * Extra fields preserved from an `HttpException` body object so that
   * endpoints can attach contextual data to their responses (e.g. the
   * login lockout exposes `failedAttempts` / `attemptsRemaining` /
   * `lockedUntil` on 401). Standard fields (statusCode/message/error/
   * path/timestamp) always win on key collision.
   */
  extras?: Record<string, unknown>;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(normalized.statusCode).json({
      // Spread first so the standard fields below win on any key collision.
      ...(normalized.extras ?? {}),
      statusCode: normalized.statusCode,
      message: normalized.message,
      error: normalized.error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(exception: unknown): NormalizedError {
    // 1) NestJS HttpException — use its status/body as-is.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { statusCode: status, message: body, error: this.errorNameForStatus(status) };
      }
      const { message: bodyMessage, error: bodyError, ...rest } = body as {
        message?: string | string[];
        error?: string;
        [key: string]: unknown;
      };
      return {
        statusCode: status,
        message: bodyMessage ?? exception.message,
        error: bodyError ?? this.errorNameForStatus(status),
        extras: Object.keys(rest).length > 0 ? rest : undefined,
      };
    }

    // 2) Prisma known-request errors — map common codes to HTTP semantics.
    //    See https://www.prisma.io/docs/reference/api-reference/error-reference
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaKnownError(exception);
    }

    // 3) Prisma validation error — bad input shape.
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid query parameters',
        error: 'BadRequest',
      };
    }

    // 4) Anything else — generic 500. Do NOT leak the internal message.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }

  private fromPrismaKnownError(
    err: Prisma.PrismaClientKnownRequestError,
  ): NormalizedError {
    switch (err.code) {
      // Unique constraint failed
      case 'P2002': {
        const target = (err.meta as { target?: string[] } | undefined)?.target;
        const fields = Array.isArray(target) ? target.join(', ') : 'value';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Duplicate ${fields}: a record with the same value already exists`,
          error: 'Conflict',
        };
      }
      // Foreign-key constraint failed (referenced row missing)
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference: a related resource does not exist',
          error: 'BadRequest',
        };
      // Record not found (update/delete on missing row)
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'NotFound',
        };
      // Anything else — keep as 500 but include the Prisma code so the
      // log line in the interceptor pinpoints it.
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Database error (${err.code})`,
          error: 'InternalServerError',
        };
    }
  }

  private errorNameForStatus(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) return 'BadRequest';
    if (status === HttpStatus.UNAUTHORIZED) return 'Unauthorized';
    if (status === HttpStatus.FORBIDDEN) return 'Forbidden';
    if (status === HttpStatus.NOT_FOUND) return 'NotFound';
    if (status === HttpStatus.CONFLICT) return 'Conflict';
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) return 'UnprocessableEntity';
    if (status === HttpStatus.TOO_MANY_REQUESTS) return 'TooManyRequests';
    if (status >= 500) return 'InternalServerError';
    return 'Error';
  }
}
