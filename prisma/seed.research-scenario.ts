/**
 * Deterministic, idempotent research-dashboard scenario.
 *
 * The records are persisted in PostgreSQL and are explicitly enrolled in the
 * isolated cohort PILOT_2026_10_02. The dashboard excludes this cohort from
 * the unfiltered view; request ?cohort=PILOT_2026_10_02 to inspect the cutoff.
 *
 * Production execution is blocked unless ALLOW_ILLUSTRATIVE_RESEARCH_SEED=true.
 */
import {
  AccountType,
  CategorySource,
  CategoryType,
  FeedbackType,
  FinancialLiteracyLevel,
  IncomeType,
  Prisma,
  PrismaClient,
  SurveyType,
  TransactionType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { ResearchDashboardService } from '../src/modules/research-dashboard/application/research-dashboard.service';
import { defaultQuestionsForSurveyType } from '../src/modules/surveys/domain/default-surveys';

const prisma = new PrismaClient();
const COHORT_CODE = 'PILOT_2026_10_02';
const COHORT_LABEL = 'Cohorte de 30 participantes';
const CUTOFF_DATE = '2026-10-02';
const CUTOFF_ANCHOR = new Date('2026-10-02T15:00:00.000Z');
const EMAIL_SUFFIX = '@research-scenario.zenda.invalid';
const ENROLLMENT_EVENT = 'research_cohort_enrolled';
const BEHAVIOR_EVENT = 'research_behavior_observation';
const CLASSIFICATION_EVENT = 'research_ai_classification_evaluated';
const DAY_MS = 86_400_000;

interface SurveyIds {
  pre: string;
  post: string;
  sus: string;
  satisfaction: string;
  utilityQuestionId: string;
  continuationQuestionId: string;
}

function daysAgo(days: number, hour = 15): Date {
  const date = new Date(CUTOFF_ANCHOR.getTime() - days * DAY_MS);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function ensureSurvey(type: SurveyType): Promise<{
  id: string;
  questions: Array<{ id: string; order: number }>;
}> {
  const existing = await prisma.survey.findFirst({ where: { type } });
  const defaults = defaultQuestionsForSurveyType(type);
  if (existing) {
    const embedded = Array.isArray(existing.questionsJson)
      ? existing.questionsJson
          .filter(
            (item): item is { id: string; order: number } =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as { id?: unknown }).id === 'string' &&
              typeof (item as { order?: unknown }).order === 'number',
          )
          .map((item) => ({ id: item.id, order: item.order }))
      : [];
    if (embedded.length > 0) return { id: existing.id, questions: embedded };
    const updated = await prisma.survey.update({
      where: { id: existing.id },
      data: { questionsJson: defaults as unknown as Prisma.InputJsonValue },
    });
    return {
      id: updated.id,
      questions: defaults.map((question) => ({
        id: question.id,
        order: question.order,
      })),
    };
  }
  const survey = await prisma.survey.create({
    data: {
      type,
      questionsJson: defaults as unknown as Prisma.InputJsonValue,
    },
  });
  return {
    id: survey.id,
    questions: defaults.map((question) => ({
      id: question.id,
      order: question.order,
    })),
  };
}

async function ensureSurveys(): Promise<SurveyIds> {
  const [pre, post, sus, satisfaction] = await Promise.all([
    ensureSurvey(SurveyType.PRE),
    ensureSurvey(SurveyType.POST),
    ensureSurvey(SurveyType.SUS),
    ensureSurvey(SurveyType.SATISFACTION),
  ]);
  return {
    pre: pre.id,
    post: post.id,
    sus: sus.id,
    satisfaction: satisfaction.id,
    utilityQuestionId:
      satisfaction.questions.find((question) => question.order === 3)?.id ?? 'satisfaction-003',
    continuationQuestionId:
      satisfaction.questions.find((question) => question.order === 6)?.id ?? 'satisfaction-006',
  };
}

async function ensureCategory(name: string, transactionType: TransactionType): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { name, type: CategoryType.SYSTEM, deletedAt: null },
  });
  if (existing) return existing.id;
  const category = await prisma.category.create({
    data: {
      name,
      type: CategoryType.SYSTEM,
      transactionType,
      icon: name === 'Food' ? 'food' : 'transport',
    },
  });
  return category.id;
}

function satisfactionAnswers(index: number, surveys: SurveyIds): Prisma.InputJsonObject {
  return {
    'satisfaction-001': '4',
    'satisfaction-002': '4',
    [surveys.utilityQuestionId]: index < 24 ? '4' : '3',
    'satisfaction-004': '4',
    'satisfaction-005': index < 22 ? '4' : '3',
    [surveys.continuationQuestionId]: index < 23 ? '4' : '3',
    'satisfaction-007': index < 22 ? '4' : '3',
    'satisfaction-008': 'El registro y resumen de movimientos.',
    'satisfaction-009': 'Más comparaciones mensuales.',
    'satisfaction-010': 'La recomendación de separar ahorro al recibir ingresos.',
    'satisfaction-011': 'Ninguna parte resultó confusa.',
  };
}

async function seedParticipant(
  index: number,
  passwordHash: string,
  surveys: SurveyIds,
): Promise<string> {
  const number = String(index + 1).padStart(2, '0');
  const enrolledAt = daysAgo(30, 14);
  const user = await prisma.user.create({
    data: {
      email: `participant.${number}${EMAIL_SUFFIX}`,
      passwordHash,
      fullName: `Participante ${number}`,
      emailVerifiedAt: enrolledAt,
      age: 18 + (index % 7),
      university: index < 18 ? 'UPC' : index < 25 ? 'UNMSM' : 'PUCP',
      incomeType: index % 3 === 0 ? IncomeType.PART_TIME : IncomeType.FAMILY,
      averageMonthlyIncome: 900 + (index % 6) * 100,
      financialLiteracyLevel: FinancialLiteracyLevel.MEDIUM,
      profileCompleted: true,
      consentGiven: true,
      consentAt: enrolledAt,
      privacyPolicyVersion: 'RESEARCH_COHORT_V1',
      termsVersion: 'RESEARCH_COHORT_V1',
      createdAt: enrolledAt,
    },
  });

  await prisma.$transaction([
    prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        eventType: ENROLLMENT_EVENT,
        metadata: {
          code: COHORT_CODE,
          label: COHORT_LABEL,
          cutoffDate: CUTOFF_DATE,
          excludedFromDefault: true,
          purpose: 'RESEARCH_DASHBOARD_COHORT',
        },
        createdAt: enrolledAt,
      },
    }),
    prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        eventType: 'app_session_started',
        metadata: {
          app_version: '1.0.0',
          build_number: '6',
          cohort: COHORT_CODE,
        },
        createdAt: daysAgo(index % 7, 16),
      },
    }),
    prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        eventType: BEHAVIOR_EVENT,
        metadata: {
          cohortCode: COHORT_CODE,
          phase: 'PRE',
          habitualExpenseTracking: index < 10,
          expensePlanning: index < 12,
        },
        createdAt: daysAgo(29, 16),
      },
    }),
    prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        eventType: BEHAVIOR_EVENT,
        metadata: {
          cohortCode: COHORT_CODE,
          phase: 'POST',
          habitualExpenseTracking: index < 19,
          expensePlanning: index < 20,
        },
        createdAt: daysAgo(2, 16),
      },
    }),
    prisma.surveyResponse.create({
      data: {
        userId: user.id,
        surveyId: surveys.pre,
        answersJson: { scenario: COHORT_CODE, measurement: 'PRE' },
        score: 54,
        completedAt: daysAgo(28, 17),
      },
    }),
    prisma.surveyResponse.create({
      data: {
        userId: user.id,
        surveyId: surveys.post,
        answersJson: { scenario: COHORT_CODE, measurement: 'POST' },
        score: 76,
        completedAt: daysAgo(2, 17),
      },
    }),
    prisma.surveyResponse.create({
      data: {
        userId: user.id,
        surveyId: surveys.sus,
        answersJson: Object.fromEntries(
          Array.from({ length: 10 }, (_, item) => [
            `sus-${String(item + 1).padStart(3, '0')}`,
            item % 2 === 0 ? '4' : '2',
          ]),
        ),
        score: 77.5,
        completedAt: daysAgo(1, 17),
      },
    }),
    prisma.surveyResponse.create({
      data: {
        userId: user.id,
        surveyId: surveys.satisfaction,
        answersJson: satisfactionAnswers(index, surveys),
        score: 4.1,
        completedAt: daysAgo(1, 18),
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Cuenta del escenario ilustrativo',
        type: AccountType.DIGITAL_WALLET,
        openingBalance: 300,
        createdAt: daysAgo(27),
      },
    }),
  ]);

  if (index < 6) {
    await prisma.feedback.create({
      data: {
        userId: user.id,
        type: FeedbackType.GENERAL,
        rating: 4,
        message:
          index % 2 === 0
            ? 'El resumen facilita comprender mis gastos.'
            : 'Los presupuestos y metas ayudan a planificar el mes.',
        screenName: 'research-scenario',
        createdAt: daysAgo(1, 19),
      },
    });
  }
  return user.id;
}

async function seedFinance(
  userIds: string[],
  foodCategoryId: string,
  transportCategoryId: string,
): Promise<void> {
  const now = new Date();
  const budgets = new Map<string, string>();
  for (let index = 0; index < 21; index++) {
    const budget = await prisma.budget.create({
      data: {
        userId: userIds[index],
        name: 'Presupuesto del escenario ilustrativo',
        amountLimit: 500,
        month: now.getUTCMonth() + 1,
        year: now.getUTCFullYear(),
        createdAt: daysAgo(20),
      },
    });
    budgets.set(userIds[index], budget.id);
  }

  for (let index = 0; index < 18; index++) {
    await prisma.savingsGoal.create({
      data: {
        userId: userIds[index],
        name: 'Meta de ahorro del escenario ilustrativo',
        targetAmount: 1000,
        currentAmount: 250,
        dueDate: new Date(Date.now() + 90 * DAY_MS),
        createdAt: daysAgo(18),
      },
    });
  }

  let caseIndex = 0;
  for (let userIndex = 0; userIndex < 27; userIndex++) {
    const transactionCount = userIndex < 19 ? 4 : 3;
    for (let item = 0; item < transactionCount; item++) {
      const isCorrect = caseIndex < 84;
      const expectedCategoryId = caseIndex % 2 === 0 ? foodCategoryId : transportCategoryId;
      const alternateCategoryId =
        expectedCategoryId === foodCategoryId ? transportCategoryId : foodCategoryId;
      const predictedCategoryId = isCorrect ? expectedCategoryId : alternateCategoryId;
      const occurredAt = daysAgo(caseIndex % 14, 12 + (caseIndex % 5));
      const transaction = await prisma.transaction.create({
        data: {
          userId: userIds[userIndex],
          categoryId: expectedCategoryId,
          suggestedCategoryId: predictedCategoryId,
          budgetId: budgets.get(userIds[userIndex]) ?? null,
          type: TransactionType.EXPENSE,
          amount: 8 + (caseIndex % 25),
          description: `[ESCENARIO ILUSTRATIVO] Caso etiquetado ${caseIndex + 1}`,
          occurredAt,
          createdAt: occurredAt,
          aiConfidence: isCorrect ? 0.91 : 0.62,
          categorySource: isCorrect ? CategorySource.AI : CategorySource.AI_OVERRIDDEN,
        },
      });
      await prisma.analyticsEvent.create({
        data: {
          userId: userIds[userIndex],
          eventType: CLASSIFICATION_EVENT,
          metadata: {
            cohortCode: COHORT_CODE,
            caseId: `${COHORT_CODE}-${String(caseIndex + 1).padStart(3, '0')}`,
            transactionId: transaction.id,
            predictedCategoryId,
            expectedCategoryId,
            isCorrect,
            reviewSource: 'INDEPENDENT_LABEL',
          },
          createdAt: occurredAt,
        },
      });
      caseIndex += 1;
    }
  }
}

async function validateScenario(): Promise<void> {
  const enrollment = await prisma.analyticsEvent.findMany({
    where: { eventType: ENROLLMENT_EVENT },
    select: { userId: true, metadata: true },
  });
  const userIds = enrollment
    .filter((event) => {
      const metadata = event.metadata as Record<string, unknown> | null;
      return metadata?.code === COHORT_CODE;
    })
    .map((event) => event.userId);
  const [consent, transactionUsers, budgetUsers, goalUsers, evaluations] = await Promise.all([
    prisma.user.count({ where: { id: { in: userIds }, consentGiven: true } }),
    prisma.transaction.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.budget.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { userId: { in: userIds }, eventType: CLASSIFICATION_EVENT },
      select: { metadata: true },
    }),
  ]);
  const correct = evaluations.filter((event) => {
    const metadata = event.metadata as Record<string, unknown> | null;
    return metadata?.isCorrect === true;
  }).length;
  const actual = {
    participants: userIds.length,
    consent,
    transactionUsers: transactionUsers.length,
    budgetUsers: budgetUsers.length,
    goalUsers: goalUsers.length,
    classificationCases: evaluations.length,
    classificationCorrect: correct,
  };
  const expected = {
    participants: 30,
    consent: 30,
    transactionUsers: 27,
    budgetUsers: 21,
    goalUsers: 18,
    classificationCases: 100,
    classificationCorrect: 84,
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Research scenario validation failed: ${JSON.stringify({ actual, expected })}`);
  }
  const dashboard = await new ResearchDashboardService(prisma as unknown as PrismaService).build({
    cohort: COHORT_CODE,
  });
  const dashboardActual = {
    participants: dashboard.participants.totalUsers,
    consent: dashboard.participants.consentGiven,
    paired: dashboard.surveys.pairedPrePostUsers,
    preAverage: dashboard.surveys.pre.averageScore,
    postAverage: dashboard.surveys.post.averageScore,
    averageDelta: dashboard.surveys.averagePrePostDelta,
    susAverage: dashboard.surveys.sus.averageScore,
    utilityFavorable: dashboard.surveys.utilityFavorable,
    continuationIntent: dashboard.surveys.continuationIntent,
    habitualExpenseTracking: dashboard.finance.habitualExpenseTracking,
    expensePlanning: dashboard.finance.expensePlanning,
    transactionUsers: dashboard.finance.usersWithTransactions,
    budgetUsers: dashboard.finance.usersWithBudgets,
    goalUsers: dashboard.finance.usersWithGoals,
    classificationAccuracy: dashboard.ai.classificationAccuracy,
  };
  const dashboardExpected = {
    participants: 30,
    consent: 30,
    paired: 30,
    preAverage: 54,
    postAverage: 76,
    averageDelta: 22,
    susAverage: 77.5,
    utilityFavorable: { favorable: 24, total: 30, percentage: 80 },
    continuationIntent: { favorable: 23, total: 30, percentage: 76.7 },
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
    transactionUsers: 27,
    budgetUsers: 21,
    goalUsers: 18,
    classificationAccuracy: { correct: 84, total: 100, percentage: 84 },
  };
  if (JSON.stringify(dashboardActual) !== JSON.stringify(dashboardExpected)) {
    throw new Error(
      `Dashboard scenario validation failed: ${JSON.stringify({ dashboardActual, dashboardExpected })}`,
    );
  }
  const defaultDashboard = await new ResearchDashboardService(
    prisma as unknown as PrismaService,
  ).build({});
  const expectedDefaultParticipants = await prisma.user.count({
    where: { deletedAt: null, id: { notIn: userIds } },
  });
  if (defaultDashboard.participants.totalUsers !== expectedDefaultParticipants) {
    throw new Error(
      `Synthetic cohort leaked into the default dashboard: ${JSON.stringify({ actual: defaultDashboard.participants.totalUsers, expected: expectedDefaultParticipants })}`,
    );
  }
  console.log('Research scenario validated:', dashboardActual);
}

async function main(): Promise<void> {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_ILLUSTRATIVE_RESEARCH_SEED !== 'true'
  ) {
    throw new Error(
      'Refusing to seed illustrative research data in production. Set ALLOW_ILLUSTRATIVE_RESEARCH_SEED=true only for an intentional stakeholder demo.',
    );
  }

  await prisma.user.deleteMany({
    where: { email: { endsWith: EMAIL_SUFFIX } },
  });
  const [surveys, passwordHash, foodCategoryId, transportCategoryId] = await Promise.all([
    ensureSurveys(),
    bcrypt.hash(randomUUID(), 12),
    ensureCategory('Food', TransactionType.EXPENSE),
    ensureCategory('Transportation', TransactionType.EXPENSE),
  ]);
  const userIds: string[] = [];
  for (let index = 0; index < 30; index++) {
    userIds.push(await seedParticipant(index, passwordHash, surveys));
  }
  await seedFinance(userIds, foodCategoryId, transportCategoryId);
  await validateScenario();
  console.log(`Open /api/research-dashboard?cohort=${COHORT_CODE}&token=<token>`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
