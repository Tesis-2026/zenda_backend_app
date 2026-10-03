import { ResearchDashboardData } from '../../src/modules/research-dashboard/application/research-dashboard.types';
import { renderResearchDashboard } from '../../src/modules/research-dashboard/interface/research-dashboard.view';

const dashboardData: ResearchDashboardData = {
  generatedAt: '2026-09-26T15:30:00.000Z',
  cohort: null,
  period: { from: '2026-09-01', to: '2026-09-26', label: 'Septiembre 2026' },
  participants: {
    totalUsers: 20,
    activeUsers: 14,
    profileCompleted: 18,
    consentGiven: 20,
    averageAge: 21.4,
    averageMonthlyIncome: 950,
    universities: [{ label: 'UPC', count: 12, percentage: 60 }],
    incomeTypes: [{ label: 'PART_TIME', count: 8, percentage: 40 }],
    literacyLevels: [{ label: 'MEDIUM', count: 11, percentage: 55 }],
  },
  usage: {
    totalEvents: 280,
    sessions: 74,
    dailyActiveUsersAverage: 8.2,
    eventsByType: [{ label: 'app_session_started', count: 74, percentage: 26.4 }],
    daily: [
      { date: '2026-09-25', activeUsers: 8, events: 30, transactions: 12, chatMessages: 5 },
      { date: '2026-09-26', activeUsers: 10, events: 38, transactions: 16, chatMessages: 9 },
    ],
    betaBuilds: [{ label: 'v1.0.0 / build 6', count: 14, percentage: 70 }],
  },
  finance: {
    transactions: 124,
    usersWithTransactions: 14,
    incomeCount: 24,
    expenseCount: 92,
    transferCount: 8,
    totalIncome: 13500,
    totalExpense: 8240,
    totalTransfer: 1800,
    budgets: 18,
    usersWithBudgets: 12,
    goals: 9,
    usersWithGoals: 7,
    accounts: 26,
    accountTypes: [{ label: 'CASH', count: 14, percentage: 53.8 }],
    aiCategorizedTransactions: 68,
    aiCategoryShare: 54.8,
    budgetLinkedTransactions: 60,
    budgetLinkedShare: 48.4,
    habitualExpenseTracking: {
      pre: 10,
      post: 19,
      total: 30,
      prePercentage: 33.3,
      postPercentage: 63.3,
      deltaPercentagePoints: 30,
    },
    expensePlanning: {
      pre: 12,
      post: 20,
      total: 30,
      prePercentage: 40,
      postPercentage: 66.7,
      deltaPercentagePoints: 26.7,
    },
  },
  ai: {
    conversations: 32,
    usersWithConversations: 11,
    userMessages: 78,
    assistantMessages: 78,
    averageAssistantWords: 72.5,
    feedbackCount: 18,
    averageRating: 4.2,
    helpfulRate: 83.3,
    clearRate: 88.9,
    personalizedRate: 77.8,
    classificationAccuracy: { correct: 84, total: 100, percentage: 84 },
    comments: ['Consejo claro y útil'],
  },
  surveys: {
    pre: { completed: 20, averageScore: 58 },
    post: { completed: 8, averageScore: 72 },
    sus: { completed: 9, averageScore: 81.5 },
    satisfaction: { completed: 9, averageScore: 4.3 },
    pairedPrePostUsers: 8,
    averagePrePostDelta: 14,
    averagePrePostDeltaPercentage: 24.1,
    utilityFavorable: { favorable: 24, total: 30, percentage: 80 },
    continuationIntent: { favorable: 23, total: 30, percentage: 76.7 },
    satisfactionLikert: [
      { order: 1, text: 'Zenda me ayudó a organizarme', average: 4.4, responses: 9 },
    ],
    openAnswers: [{ question: '¿Qué mejorarías?', answer: 'Más gráficos mensuales' }],
  },
  qualitativeFeedback: {
    total: 4,
    averageRating: 4.5,
    samples: ['La aplicación es fácil de entender'],
  },
};

describe('Research dashboard stakeholder view', () => {
  it('renders executive evidence, navigation, accessible charts, and exports', () => {
    const html = renderResearchDashboard({ data: dashboardData, token: 'safe token' });

    expect(html).toContain('Resumen ejecutivo');
    expect(html).toContain('Evidencia comparable');
    expect(html).toContain('Actividad diaria');
    expect(html).toContain('Indicadores de resultado');
    expect(html).toContain('84 de 100 · 84%');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Secciones del dashboard"');
    expect(html).toContain('/api/research-dashboard/export.csv?token=safe+token');
    expect(html).toContain('Datos agregados y seudonimizados');
  });

  it('labels illustrative cohorts and keeps the cohort in export links', () => {
    const html = renderResearchDashboard({
      data: {
        ...dashboardData,
        cohort: {
          code: 'ILLUSTRATIVE_30',
          label: 'Escenario ilustrativo de 30 participantes',
          synthetic: true,
        },
      },
      token: 'safe token',
    });

    expect(html).toContain('Escenario ilustrativo');
    expect(html).toContain('no constituyen resultados observados');
    expect(html).toContain('cohort=ILLUSTRATIVE_30');
  });

  it('escapes qualitative content and token attributes', () => {
    const unsafe: ResearchDashboardData = {
      ...dashboardData,
      ai: { ...dashboardData.ai, comments: ['<script>alert(1)</script>'] },
    };

    const html = renderResearchDashboard({ data: unsafe, token: '\"><img src=x>' });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('value=""><img');
  });

  it('shows an honest early-stage status when no paired cohort exists', () => {
    const html = renderResearchDashboard({
      data: {
        ...dashboardData,
        surveys: { ...dashboardData.surveys, pairedPrePostUsers: 0 },
      },
    });

    expect(html).toContain('Esperando cohorte pareada');
  });
});
