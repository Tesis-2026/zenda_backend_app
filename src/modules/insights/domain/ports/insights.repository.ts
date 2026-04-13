export interface PeriodSummaryParams {
  userId: string;
  from: Date;
  to: Date;
}

export interface MonthSummaryParams extends PeriodSummaryParams {
  year: number;
  month: number;
}

export interface PeriodSummaryData {
  totalIncome: number;
  totalExpense: number;
  topCategories: { name: string; amount: number }[];
  goalsProgress: {
    name: string;
    currentAmount: number;
    targetAmount: number;
    progressPercent: number;
  }[];
}

export type MonthSummaryData = PeriodSummaryData;

export interface MonthComparisonEntry {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export abstract class IInsightsRepository {
  abstract getMonthSummary(params: MonthSummaryParams): Promise<MonthSummaryData>;
  abstract getPeriodSummary(params: PeriodSummaryParams): Promise<PeriodSummaryData>;
  abstract getMonthComparison(userId: string, months: number): Promise<MonthComparisonEntry[]>;
}
