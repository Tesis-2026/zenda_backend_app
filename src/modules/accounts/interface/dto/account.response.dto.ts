import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({ example: '0403f4f8-f5e0-4f9b-b9e8-36c33320e8be' })
  id!: string;

  @ApiProperty({ example: 'Efectivo' })
  name!: string;

  @ApiProperty({
    enum: ['CASH', 'BANK_ACCOUNT', 'DIGITAL_WALLET', 'CREDIT_CARD'],
    example: 'CASH',
  })
  type!: 'CASH' | 'BANK_ACCOUNT' | 'DIGITAL_WALLET' | 'CREDIT_CARD';

  @ApiProperty({ example: 'PEN' })
  currency!: string;

  @ApiProperty({ example: 120.5 })
  openingBalance!: number;

  @ApiProperty({ example: 87.2 })
  currentBalance!: number;

  @ApiProperty({ example: 0 })
  debt!: number;

  @ApiPropertyOptional({ example: 1500, nullable: true })
  creditLimit?: number | null;

  @ApiPropertyOptional({ example: 'BCP', nullable: true })
  institution?: string | null;

  @ApiProperty({ example: true })
  isDefault!: boolean;
}
