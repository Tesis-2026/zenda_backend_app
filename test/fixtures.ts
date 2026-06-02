/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Schema-shaped fixtures shared across contract suites. Each factory returns an
 * object matching the shape a use case returns to its controller, so the
 * controller's response-DTO mapping runs for real against realistic data.
 */

const NOW = new Date('2026-05-31T12:00:00.000Z');

/** A valid UUID v4 for request bodies that validate `@IsUUID('4')`. */
export const UUID = '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8';
export const UUID2 = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

export const fixtureUser = {
  sub: 'user-1',
  email: 'ana@test.com',
  tokenVersion: 0,
  consentGiven: true,
};

export function makeTransactionResult(over: Record<string, any> = {}) {
  return {
    id: 'tx-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    type: 'EXPENSE',
    currency: 'PEN',
    amount: 25.5,
    description: 'Café',
    occurredAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    category: { id: 'cat-1', name: 'Comida', icon: 'food' },
    suggestedCategoryId: null,
    aiConfidence: null,
    categorySource: 'USER',
    newlyCompletedChallenges: [],
    ...over,
  };
}

export function makeCategory(over: Record<string, any> = {}) {
  return {
    id: 'cat-1',
    name: 'Comida',
    type: 'SYSTEM',
    icon: 'food',
    transactionType: 'EXPENSE',
    userId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

export function makeBudget(over: Record<string, any> = {}) {
  return {
    id: 'budget-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    categoryName: 'Comida',
    amountLimit: 150,
    currentSpent: 80,
    percentageUsed: 53.3,
    month: 5,
    year: 2026,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

export function makeGoal(over: Record<string, any> = {}) {
  return {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Fondo de Emergencia',
    targetAmount: 3000,
    currentAmount: 850,
    isCompleted: false,
    completedAt: null,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

export function makeRecommendation(over: Record<string, any> = {}) {
  return {
    id: 'rec-1',
    type: 'SAVINGS',
    message: 'Automatiza una transferencia de S/ 100 el día de pago',
    suggestedAction: 'Configura un ahorro automático',
    isActive: true,
    viewedAt: null,
    dismissedAt: null,
    expiresAt: null,
    feedbackAccepted: null,
    feedbackAt: null,
    modelVersion: 'rules-v1',
    source: 'local-rules',
    inputContextJson: null,
    createdAt: NOW,
    ...over,
  };
}

export function makePrediction(over: Record<string, any> = {}) {
  return {
    id: 'pred-1',
    period: '2026-06',
    type: 'EXPENSE',
    predictedTotal: 500,
    predictedByCategory: [{ categoryId: 'cat-1', categoryName: 'Comida', amount: 120 }],
    confidenceLevel: 'medium',
    confidenceInterval: { lower: 425, upper: 575 },
    narrative: 'Tu gasto previsto se mantiene estable.',
    modelVersion: 'stat-v1',
    actualTotal: null,
    accuracy: null,
    createdAt: NOW,
    ...over,
  };
}

export function makeProgressSnapshot(over: Record<string, any> = {}) {
  return {
    id: 'fp-1',
    userId: 'user-1',
    period: '2026-05',
    budgetComplianceScore: 80,
    savingsRatePct: 30,
    overspendCategoriesCount: 1,
    recommendationsShown: 5,
    recommendationsAccepted: 2,
    recommendationAcceptanceRate: 40,
    quizzesCompleted: 3,
    avgQuizScore: 75,
    createdAt: NOW,
    ...over,
  };
}

export function makeTopic(over: Record<string, any> = {}) {
  return {
    id: 'topic-1',
    title: 'Presupuesto 50/30/20',
    content: 'Aprende a repartir tus ingresos en necesidades, deseos y ahorro.',
    difficulty: 'BEGINNER',
    order: 1,
    isCompleted: false,
    completedAt: null,
    ...over,
  };
}

export function makeChallenge(over: Record<string, any> = {}) {
  return {
    id: 'challenge-1',
    title: 'Sin gastos hormiga por 7 días',
    description: 'Evita compras impulsivas durante una semana.',
    reward: 'Insignia Ahorrador',
    status: 'AVAILABLE',
    acceptedAt: null,
    completedAt: null,
    expiresAt: null,
    ...over,
  };
}

export function makeBadge(over: Record<string, any> = {}) {
  return {
    id: 'badge-1',
    name: 'Sabio Financiero',
    description: 'Completaste todos los temas educativos.',
    criteria: 'Completar todos los temas',
    iconUrl: null,
    isEarned: false,
    earnedAt: null,
    ...over,
  };
}

export function makeQuiz(over: Record<string, any> = {}) {
  return {
    topicId: 'topic-1',
    language: 'es',
    questions: [
      { id: 'q1', difficulty: 'BEGINNER', text: '¿Qué es el ahorro?', options: ['A', 'B', 'C'] },
    ],
    ...over,
  };
}

export function makeQuizResult(over: Record<string, any> = {}) {
  return {
    score: 80,
    correctCount: 4,
    totalCount: 5,
    level: 'HIGH',
    feedback: [{ questionId: 'q1', correct: true, correctAnswer: 'A' }],
    ...over,
  };
}

export function makeSurvey(type: string, over: Record<string, any> = {}) {
  return {
    id: 'survey-1',
    type,
    questionsJson: [
      { id: 'sq1', order: 1, text: '¿Llevas un presupuesto?', options: ['Sí', 'No'], correctAnswer: 'Sí' },
      { id: 'sq2', order: 2, text: '¿Ahorras cada mes?', options: ['Sí', 'No'], correctAnswer: 'Sí' },
    ],
    ...over,
  };
}

export const NOW_DATE = NOW;
