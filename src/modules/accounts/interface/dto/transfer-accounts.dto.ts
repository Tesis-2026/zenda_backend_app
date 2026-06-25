import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class TransferAccountsDto {
  @ApiProperty({ example: '0403f4f8-f5e0-4f9b-b9e8-36c33320e8be' })
  @IsUUID('4')
  fromAccountId!: string;

  @ApiProperty({ example: '73ae7668-1c5f-4b7a-a16d-420a6a6a5b90' })
  @IsUUID('4')
  toAccountId!: string;

  @ApiProperty({ example: 50, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'Pago de tarjeta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: '2026-06-24T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
