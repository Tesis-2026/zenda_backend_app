export enum IncomeType {
  SCHOLARSHIP = 'SCHOLARSHIP',
  PART_TIME = 'PART_TIME',
  FAMILY = 'FAMILY',
  MIXED = 'MIXED',
}

export enum FinancialLiteracyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class UserProfileEntity {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly fullName: string,
    readonly age: number | null,
    readonly university: string | null,
    readonly incomeType: IncomeType | null,
    readonly averageMonthlyIncome: number | null,
    readonly financialLiteracyLevel: FinancialLiteracyLevel | null,
    readonly profileCompleted: boolean,
    readonly currency: string,
    readonly createdAt: Date,
    // Security + consent (exposed so the UI can render the privacy
    // panel required by Law 29733 and surface lockout state outside
    // of the login flow's 401 body).
    readonly consentGiven: boolean,
    readonly consentAt: Date | null,
    readonly failedLoginAttempts: number,
    readonly lockedUntil: Date | null,
  ) {}

  static create(params: {
    id: string;
    email: string;
    fullName: string;
    age: number | null;
    university: string | null;
    incomeType: IncomeType | null;
    averageMonthlyIncome: number | null;
    financialLiteracyLevel: FinancialLiteracyLevel | null;
    profileCompleted: boolean;
    currency: string;
    createdAt: Date;
    consentGiven: boolean;
    consentAt: Date | null;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
  }): UserProfileEntity {
    return new UserProfileEntity(
      params.id,
      params.email,
      params.fullName,
      params.age,
      params.university,
      params.incomeType,
      params.averageMonthlyIncome,
      params.financialLiteracyLevel,
      params.profileCompleted,
      params.currency,
      params.createdAt,
      params.consentGiven,
      params.consentAt,
      params.failedLoginAttempts,
      params.lockedUntil,
    );
  }
}
