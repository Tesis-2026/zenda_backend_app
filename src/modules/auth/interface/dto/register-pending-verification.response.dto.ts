import { ApiProperty } from '@nestjs/swagger';

export class RegisterPendingVerificationResponseDto {
  @ApiProperty({
    description: 'Created user identifier. Account is pending email verification.',
  })
  userId!: string;

  @ApiProperty({ example: 'student@uni.edu.pe' })
  email!: string;

  @ApiProperty({
    description:
      'True when the client must ask the user for the email verification code before creating a session.',
    example: true,
  })
  requiresEmailVerification!: true;
}
