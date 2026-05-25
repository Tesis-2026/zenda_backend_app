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

  // ── Security + consent (Integration fix #7) ────────────────────────
  // Exposed so the profile screen can render the consent banner
  // required by Law 29733 and surface lockout state outside the
  // login flow's 401 body.

  @ApiProperty({
    description:
      'True when the user accepted the data-processing notice (Law 29733). ' +
      'Drives the consent banner state on the profile screen.',
  })
  consentGiven!: boolean;

  @ApiPropertyOptional({
    description: 'When the user accepted the notice. Null when never accepted.',
  })
  consentAt!: Date | null;

  @ApiProperty({
    description:
      'Failed login attempts since the last successful login. Resets to 0 on success.',
    minimum: 0,
  })
  failedLoginAttempts!: number;

  @ApiPropertyOptional({
    description:
      'When the lockout expires. Null when the account is not locked. ' +
      'Mirrors the value the 401 login body returns; surfaced here so ' +
      'a logged-in client can show a "session locked elsewhere" hint.',
  })
  lockedUntil!: Date | null;
}
