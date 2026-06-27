export interface ResearchDashboardQuery {
  from?: string;
  to?: string;
}

export interface ResearchPeriod {
  from: string | null;
  to: string | null;
  label: string;
}

export interface CountShare {
  label: string;
  count: number;
  percentage: number;
}

export interface ScoreSummary {
  completed: number;
  averageScore: number | null;
}

export interface SatisfactionQuestionSummary {
  order: number;
  text: string;
  average: number | null;
  responses: number;
}

export interface OpenAnswerSample {
  question: string;
  answer: string;
}

export interface DailyResearchPoint {
  date: string;
  activeUsers: number;
  events: number;
  transactions: number;
  chatMessages: number;
}

export interface ResearchDashboardData {
  generatedAt: string;
  period: ResearchPeriod;
  participants: {
    totalUsers: number;
    activeUsers: number;
    profileCompleted: number;
    consentGiven: number;
    averageAge: number | null;
    averageMonthlyIncome: number | null;
    universities: CountShare[];
    incomeTypes: CountShare[];
    literacyLevels: CountShare[];
  };
  usage: {
    totalEvents: number;
    sessions: number;
    dailyActiveUsersAverage: number;
    eventsByType: CountShare[];
    daily: DailyResearchPoint[];
    betaBuilds: CountShare[];
  };
  finance: {
    transactions: number;
    usersWithTransactions: number;
    incomeCount: number;
    expenseCount: number;
    transferCount: number;
    totalIncome: number;
    totalExpense: number;
    totalTransfer: number;
    budgets: number;
    usersWithBudgets: number;
    goals: number;
    usersWithGoals: number;
    accounts: number;
    accountTypes: CountShare[];
    aiCategorizedTransactions: number;
    aiCategoryShare: number;
    budgetLinkedTransactions: number;
    budgetLinkedShare: number;
  };
  ai: {
    conversations: number;
    usersWithConversations: number;
    userMessages: number;
    assistantMessages: number;
    averageAssistantWords: number | null;
    feedbackCount: number;
    averageRating: number | null;
    helpfulRate: number | null;
    clearRate: number | null;
    personalizedRate: number | null;
    comments: string[];
  };
  surveys: {
    pre: ScoreSummary;
    post: ScoreSummary;
    sus: ScoreSummary;
    satisfaction: ScoreSummary;
    pairedPrePostUsers: number;
    averagePrePostDelta: number | null;
    averagePrePostDeltaPercentage: number | null;
    satisfactionLikert: SatisfactionQuestionSummary[];
    openAnswers: OpenAnswerSample[];
  };
  qualitativeFeedback: {
    total: number;
    averageRating: number | null;
    samples: string[];
  };
}
