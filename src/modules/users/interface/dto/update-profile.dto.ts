import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { FinancialLiteracyLevel, IncomeType } from '../../domain/user-profile.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @ApiPropertyOptional({ minimum: 15, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(99)
  age?: number | null;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  university?: string | null;

  @ApiPropertyOptional({ enum: IncomeType })
  @IsOptional()
  @IsEnum(IncomeType)
  incomeType?: IncomeType | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageMonthlyIncome?: number | null;

  @ApiPropertyOptional({ enum: FinancialLiteracyLevel })
  @IsOptional()
  @IsEnum(FinancialLiteracyLevel)
  financialLiteracyLevel?: FinancialLiteracyLevel | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  profileCompleted?: boolean;

  @ApiPropertyOptional({ example: 'PEN', maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
