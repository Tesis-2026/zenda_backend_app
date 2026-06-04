import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'FCM registration token from Firebase Messaging SDK' })
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  token!: string;
}

export class SetDailyReminderTimeDto {
  @ApiProperty({
    description: '24h local time when the daily reminder should fire (HH:mm)',
    nullable: true,
    example: '20:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be HH:mm 24h' })
  time!: string | null;
}
