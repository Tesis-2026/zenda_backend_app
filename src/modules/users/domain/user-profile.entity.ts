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
    );
  }
}
