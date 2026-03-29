import {
  FinancialLiteracyLevel,
  IncomeType,
  UserProfileEntity,
} from '../user-profile.entity';

export interface UpdateProfileData {
  fullName?: string;
  age?: number | null;
  university?: string | null;
  incomeType?: IncomeType | null;
  averageMonthlyIncome?: number | null;
  financialLiteracyLevel?: FinancialLiteracyLevel | null;
  profileCompleted?: boolean;
  currency?: string;
}

export abstract class IUserProfileRepository {
  abstract findById(id: string): Promise<UserProfileEntity | null>;
  abstract update(
    id: string,
    data: UpdateProfileData,
  ): Promise<UserProfileEntity>;
}
