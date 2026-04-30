import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: 'student@uni.edu.pe' })
  @IsEmail()
  email!: string;
}
