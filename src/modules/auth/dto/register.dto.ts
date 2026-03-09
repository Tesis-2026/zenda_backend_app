import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@zenda.pe' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MaxLength(120)
  fullName!: string;
}
