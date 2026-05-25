import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error body produced by `GlobalExceptionFilter`. Every
 * non-2xx response uses this shape, so consumers can rely on it for
 * error rendering / observability.
 */
export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code mirroring the response status' })
  statusCode!: number;

  @ApiProperty({
    description: 'Human-readable message. May be an array of strings for multi-field validation errors.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'email must be a valid email',
  })
  message!: string | string[];

  @ApiProperty({
    example: 'BadRequest',
    description: 'Stable error type identifier (BadRequest, Unauthorized, Forbidden, NotFound, Conflict, TooManyRequests, InternalServerError)',
  })
  error!: string;

  @ApiProperty({ example: '/api/transactions' })
  path!: string;

  @ApiProperty({ example: '2026-05-24T16:00:00.000Z' })
  timestamp!: string;
}
