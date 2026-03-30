import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque refresh token received from login/register/refresh.' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
