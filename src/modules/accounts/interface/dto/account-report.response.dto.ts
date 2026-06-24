import { ApiProperty } from '@nestjs/swagger';
import { AccountResponseDto } from './account.response.dto';

export class AccountReportItemDto extends AccountResponseDto {
  @ApiProperty({ example: 320.5 })
  income!: number;

  @ApiProperty({ example: 185.2 })
  expenses!: number;

  @ApiProperty({ example: 40 })
  transferIn!: number;

  @ApiProperty({ example: 60 })
  transferOut!: number;

  @ApiProperty({ example: -205.2 })
  netChange!: number;
}

export class AccountReportResponseDto {
  @ApiProperty({ example: 780.5 })
  totalAssets!: number;

  @ApiProperty({ example: 140.9 })
  totalCreditDebt!: number;

  @ApiProperty({ type: [AccountReportItemDto] })
  accounts!: AccountReportItemDto[];

  @ApiProperty({ type: [String], example: ['Gastaste mas desde Yape / Plin: S/85.00.'] })
  insights!: string[];
}
