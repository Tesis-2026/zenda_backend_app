import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shape of the 401 body returned by `POST /auth/login` when authentication
 * fails (invalid password or already-locked account). Extends the base
 * `ApiErrorResponseDto` shape with the lockout-state fields so the frontend
 * can render a server-authoritative countdown instead of a cosmetic local
 * timer (closes ARCH-10, supports B11).
 *
 * The "user-not-found" 401 case deliberately does NOT carry these fields —
 * exposing them would let an attacker enumerate valid email addresses.
 */
export class LoginErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({
    description: 'Human-readable message',
    example: 'Invalid credentials. 2 attempts remaining before lockout.',
  })
  message!: string;

  @ApiProperty({ example: 'Unauthorized' })
  error!: string;

  @ApiProperty({ example: '/api/auth/login' })
  path!: string;

  @ApiProperty({ example: '2026-05-24T18:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({
    description:
      'How many failed attempts the account has accumulated. Omitted for the user-not-found case to avoid email enumeration.',
    nullable: true,
    example: 2,
  })
  failedAttempts?: number | null;

  @ApiPropertyOptional({
    description: 'How many attempts remain before lockout. 0 when locked.',
    nullable: true,
    example: 1,
  })
  attemptsRemaining?: number | null;

  @ApiPropertyOptional({
    description:
      'ISO-8601 timestamp when the lockout expires. Present only when the account is locked; null when the user just typed a wrong password without being locked yet.',
    nullable: true,
    example: '2026-05-24T18:15:00.000Z',
  })
  lockedUntil?: string | null;
}
