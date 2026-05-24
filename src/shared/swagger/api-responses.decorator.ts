import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto';

/**
 * Composable Swagger decorators that document the common error contract
 * produced by `GlobalExceptionFilter`. Apply them next to `@ApiOperation`
 * on each endpoint so the OpenAPI spec reflects every status the route
 * may return.
 *
 * Each helper returns a `applyDecorators(...)` so you can stack them:
 *
 *   @ApiOperation({ summary: 'Create a transaction' })
 *   @ApiCreated(TransactionResponseDto)
 *   @ApiAuthErrors()
 *   @ApiValidationError()
 *   @ApiConflictError('A transaction with the same idempotency key exists')
 */

// ── Success responses ───────────────────────────────────────────────

/** 200 OK with a typed body. */
export function ApiOk<T extends new (...args: never[]) => object>(
  dto: T,
  description = 'Success',
) {
  return ApiResponse({ status: 200, description, type: dto });
}

/** 201 Created with a typed body. */
export function ApiCreated<T extends new (...args: never[]) => object>(
  dto: T,
  description = 'Created',
) {
  return ApiResponse({ status: 201, description, type: dto });
}

/** 204 No Content (no body). */
export function ApiNoContent(description = 'No Content') {
  return ApiResponse({ status: 204, description });
}

// ── Error responses ─────────────────────────────────────────────────

/** 400 Bad Request — validation failure or malformed input. */
export function ApiValidationError(description = 'Validation failed') {
  return ApiResponse({ status: 400, description, type: ApiErrorResponseDto });
}

/**
 * Bundles the two responses every authenticated endpoint shares:
 * 401 (missing/invalid/expired/revoked token) and 429 (rate-limited).
 */
export function ApiAuthErrors() {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: 'Unauthorized — missing, invalid, expired, or revoked token',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests — rate limit exceeded for this endpoint',
      type: ApiErrorResponseDto,
    }),
  );
}

/** 403 Forbidden. */
export function ApiForbiddenError(description = 'Forbidden — caller is not allowed to perform this action') {
  return ApiResponse({ status: 403, description, type: ApiErrorResponseDto });
}

/** 404 Not Found. */
export function ApiNotFoundError(description = 'Resource not found') {
  return ApiResponse({ status: 404, description, type: ApiErrorResponseDto });
}

/** 409 Conflict — duplicates, version mismatches, business-rule violations. */
export function ApiConflictError(description = 'Conflict — resource state prevents the operation') {
  return ApiResponse({ status: 409, description, type: ApiErrorResponseDto });
}

/** 500 Internal Server Error. */
export function ApiServerError(description = 'Internal server error') {
  return ApiResponse({ status: 500, description, type: ApiErrorResponseDto });
}
