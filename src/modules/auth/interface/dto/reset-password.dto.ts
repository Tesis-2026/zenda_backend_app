import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: '64-character hex token from the reset email' })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @Length(8, 72)
  newPassword!: string;
}
