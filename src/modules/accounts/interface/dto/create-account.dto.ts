import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export enum AccountTypeDto {
  CASH = 'CASH',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  CREDIT_CARD = 'CREDIT_CARD',
}

export class CreateAccountDto {
  @ApiProperty({ example: 'Yape' })
  @IsString()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ enum: AccountTypeDto, example: AccountTypeDto.DIGITAL_WALLET })
  @IsEnum(AccountTypeDto)
  type!: AccountTypeDto;

  @ApiPropertyOptional({ example: 'PEN', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance?: number;

  @ApiPropertyOptional({ example: 1500, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 'BCP' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  institution?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
