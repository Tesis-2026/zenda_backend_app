import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum FeedbackTypeEnum {
  BUG = 'BUG',
  SUGGESTION = 'SUGGESTION',
  GENERAL = 'GENERAL',
}

export class CreateFeedbackDto {
  @ApiPropertyOptional({ enum: FeedbackTypeEnum, default: FeedbackTypeEnum.GENERAL })
  @IsOptional()
  @IsEnum(FeedbackTypeEnum)
  type?: FeedbackTypeEnum;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  screenName?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
