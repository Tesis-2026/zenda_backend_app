import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialLiteracyLevel, IncomeType } from '../../domain/user-profile.entity';

export class UserProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional()
  age!: number | null;

  @ApiPropertyOptional()
  university!: string | null;

  @ApiPropertyOptional({ enum: IncomeType })
  incomeType!: IncomeType | null;

  @ApiPropertyOptional()
  averageMonthlyIncome!: number | null;

  @ApiPropertyOptional({ enum: FinancialLiteracyLevel })
  financialLiteracyLevel!: FinancialLiteracyLevel | null;

  @ApiProperty()
  profileCompleted!: boolean;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  createdAt!: Date;
}
