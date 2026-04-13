import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'Short-lived JWT access token (15 min). Send as Bearer in Authorization header.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Long-lived opaque refresh token (7 days). Send to POST /auth/refresh to rotate.',
    example: 'a3f2c1d4e5b6...',
  })
  refreshToken!: string;
}
