import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TransactionType } from '../../domain/transaction-type.enum';

export class VoiceTransactionDraftRequestDto {
  @ApiProperty({
    example: 'Gaste 5 soles en bebida ayer',
    description: 'Recognized speech text. Audio is transcribed on-device.',
    maxLength: 240,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  text!: string;

  @ApiPropertyOptional({
    example: 'America/Lima',
    description: 'Client timezone used to resolve relative dates like hoy or ayer.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}

export class VoiceTransactionDraftResponseDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  type!: TransactionType;

  @ApiPropertyOptional({ example: 5.5, nullable: true })
  @Type(() => Number)
  amount!: number | null;

  @ApiProperty({
    example: 'bebida',
    description: 'Cleaned note ready to prefill the transaction description.',
  })
  description!: string;

  @ApiPropertyOptional({
    example: '2026-06-23T12:00:00.000Z',
    nullable: true,
  })
  occurredAt!: string | null;

  @ApiPropertyOptional({
    example: 'Cravings',
    nullable: true,
    description: 'Backend canonical category name suggested by the AI classifier.',
  })
  suggestedCategoryName!: string | null;

  @ApiPropertyOptional({
    example: 'Yape / Plin',
    nullable: true,
    description: 'Suggested account/payment medium name detected from speech.',
  })
  suggestedAccountName!: string | null;

  @ApiPropertyOptional({
    enum: ['CASH', 'BANK_ACCOUNT', 'DIGITAL_WALLET', 'CREDIT_CARD'],
    example: 'DIGITAL_WALLET',
    nullable: true,
  })
  suggestedAccountType!: string | null;

  @ApiProperty({ example: 0.84, minimum: 0, maximum: 1 })
  confidence!: number;

  @ApiProperty({
    example: [],
    type: [String],
    description: 'Warnings to show before the user saves the transaction.',
  })
  warnings!: string[];
}
