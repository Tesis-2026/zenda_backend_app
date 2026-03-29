export interface MonthSummaryParams {
  userId: string;
  year: number;
  month: number;
  from: Date;
  to: Date;
}

export interface MonthSummaryData {
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

export abstract class IInsightsRepository {
  abstract getMonthSummary(params: MonthSummaryParams): Promise<MonthSummaryData>;
}
