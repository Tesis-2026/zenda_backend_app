import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@zenda.pe' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 12, maxLength: 72 })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({
    example: true,
    description:
      'Must be true. Records explicit acceptance of the privacy notice for Ley 29733 compliance.',
  })
  @Equals(true, { message: 'Debes aceptar la politica de privacidad para crear una cuenta' })
  consentGiven!: true;

  @ApiProperty({
    example: 'privacy-2026-07-03',
    required: false,
    description: 'Privacy policy version accepted by the user.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  privacyPolicyVersion?: string;

  @ApiProperty({
    example: 'terms-2026-07-03',
    required: false,
    description: 'Terms version accepted by the user.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  termsVersion?: string;
}
