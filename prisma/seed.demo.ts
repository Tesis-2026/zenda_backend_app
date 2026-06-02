/**
 * seed.demo.ts — Single-user demo data for Zenda (thesis demo)
 *
 * Seeds ONE coherent demo user (Ana García) with a few months of realistic,
 * internally-consistent financial history, so every screen of the app shows
 * meaningful data that hangs together:
 *   - profile (part-time worker, MEDIUM literacy)
 *   - transactions (last 3 full months + a partial current month)
 *   - monthly + per-category budgets
 *   - savings goals (two in progress + one already completed)
 *   - challenges (completed / active / expired)
 *   - badges, education progress
 *   - AI predictions (with retrospective accuracy) + recommendations
 *
 * Dates are RELATIVE to "today", so the demo never goes stale: the current
 * month always has (partial) data and the dashboard/insights look alive.
 *
 * Language: code and comments in English; user-facing text (transaction
 * descriptions, goal names, recommendation copy) in Spanish per project
 * convention — the app targets Peruvian university students.
 *
 * Login:  ana.garcia@zenda.demo  /  Demo1234!Zenda
 *
 * Run:  npm run prisma:seed:demo   (or: npx ts-node prisma/seed.demo.ts)
 * Idempotent: re-running deletes the demo user (FK cascade wipes all owned
 * data) and re-seeds from scratch — no duplicate transactions.
 */

import {
  CategoryType,
  FinancialLiteracyLevel,
  IncomeType,
  NotificationType,
  PrismaClient,
  RecommendationType,
  TransactionType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEMO_EMAIL = 'ana.garcia@zenda.demo';
const DEMO_PASSWORD = 'Demo1234!Zenda';

/**
 * Stable semantic icon keys per system category — kept in sync with the main
 * seed (`ICON_BY_CATEGORY_NAME` in seed.ts) and the client's CategoryUtils.
 */
const ICON_BY_CATEGORY_NAME: Record<string, string> = {
  Food: 'food',
  Transportation: 'transport',
  Housing: 'housing',
  Utilities: 'utilities',
  Health: 'health',
  Entertainment: 'entertainment',
  Shopping: 'shopping',
  Subscriptions: 'subscriptions',
  Cravings: 'cravings',
  Savings: 'savings',
  Education: 'education',
  Other: 'other',
  Scholarship: 'scholarship',
  'Part-time work': 'work',
  Family: 'family',
  Freelance: 'freelance',
};

const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Housing', 'Utilities', 'Health',
  'Entertainment', 'Shopping', 'Subscriptions', 'Cravings',
  'Savings', 'Education', 'Other',
];
const INCOME_CATEGORIES = ['Scholarship', 'Part-time work', 'Family', 'Freelance', 'Other'];

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS — everything is relative to "now" so the demo stays current
// ─────────────────────────────────────────────────────────────────

const NOW = new Date();
const TODAY_DAY = NOW.getUTCDate();

/** Year + 1-based month for `monthsAgo` months before now (negative = future). */
function ym(monthsAgo: number): { year: number; month: number } {
  const dt = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - monthsAgo, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

/** A UTC date on `day` of the month that is `monthsAgo` months before now. */
function dim(monthsAgo: number, day: number, hour = 10): Date {
  const { year, month } = ym(monthsAgo);
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
}

/** "YYYY-MM" period string for `monthsAgo` months before now. */
function period(monthsAgo: number): string {
  const { year, month } = ym(monthsAgo);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Hash a plain-text password with bcrypt (cost 10). */
async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// ─────────────────────────────────────────────────────────────────
// TRANSACTION TEMPLATE — one balanced month for Ana (income S/1,500)
//   Needs ~S/700  |  Wants ~S/330  |  Savings S/300   → spends within income
// ─────────────────────────────────────────────────────────────────

interface TxTemplate {
  categoryName: string;
  type: TransactionType;
  amount: number;
  description: string; // Spanish — shown to the user
  day: number;
}

function monthlyTransactions(): TxTemplate[] {
  return [
    // ── Ingresos ────────────────────────────────────────────────
    { categoryName: 'Part-time work', type: TransactionType.INCOME, amount: 1500.0, description: 'Sueldo part-time – Tienda Ripley', day: 1 },
    // ── Necesidades ─────────────────────────────────────────────
    { categoryName: 'Housing', type: TransactionType.EXPENSE, amount: 450.0, description: 'Alquiler mensual – depa compartido en San Isidro', day: 2 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 85.0, description: 'Compra semanal – Metro', day: 3 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 75.0, description: 'Recarga mensual – tarjeta Metropolitano', day: 4 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 55.0, description: 'Internet – plan hogar Claro', day: 5 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 62.0, description: 'Compra semanal – Vivanda', day: 10 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 40.0, description: 'Recibo de luz – Luz del Sur', day: 12 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 28.0, description: 'Farmacia – vitaminas y analgésicos', day: 14 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 58.0, description: 'Compra semanal – Wong', day: 17 },
    // ── Gustos ──────────────────────────────────────────────────
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 22.9, description: 'Netflix – plan mensual', day: 6 },
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 12.9, description: 'Spotify Premium', day: 6 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 38.0, description: 'Cine – Cineplanet con amigas', day: 8 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 35.0, description: 'Rappi – cena de sushi', day: 13 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 89.9, description: 'Ropa – Zara Miraflores', day: 15 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 45.0, description: 'Entradas a concierto – noche de música', day: 20 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 28.5, description: 'Starbucks – cafés de la semana', day: 22 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 55.0, description: 'Libros y útiles – SBS Librería', day: 27 },
    // ── Ahorro ──────────────────────────────────────────────────
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 300.0, description: 'Transferencia mensual de ahorro', day: 1 },
  ];
}

// ─────────────────────────────────────────────────────────────────
// SEED STEPS
// ─────────────────────────────────────────────────────────────────

/** Ensure system categories exist with their icon key (mirrors seed.ts). */
async function ensureSystemCategories(): Promise<void> {
  const upsert = async (name: string, transactionType: TransactionType): Promise<void> => {
    const icon = ICON_BY_CATEGORY_NAME[name] ?? null;
    const exists = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: CategoryType.SYSTEM, deletedAt: null },
      select: { id: true },
    });
    if (exists) {
      await prisma.category.update({ where: { id: exists.id }, data: { icon } });
    } else {
      await prisma.category.create({ data: { name, type: CategoryType.SYSTEM, transactionType, icon } });
    }
  };
  for (const name of EXPENSE_CATEGORIES) await upsert(name, TransactionType.EXPENSE);
  for (const name of INCOME_CATEGORIES) await upsert(name, TransactionType.INCOME);
}

/** Fetch all system categories into a name→id lookup map. */
async function getCategoryMap(): Promise<Map<string, string>> {
  const cats = await prisma.category.findMany({
    where: { type: CategoryType.SYSTEM, deletedAt: null },
    select: { id: true, name: true },
  });
  return new Map(cats.map((c) => [c.name, c.id]));
}

/** Delete the demo user if present — FK cascade wipes all owned data. */
async function resetDemoUser(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
}

/** Create the demo user and return its id. */
async function createDemoUser(passwordHash: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      fullName: 'Ana García',
      passwordHash,
      age: 20,
      university: 'Universidad Nacional Mayor de San Marcos',
      incomeType: IncomeType.PART_TIME,
      averageMonthlyIncome: 1500,
      financialLiteracyLevel: FinancialLiteracyLevel.MEDIUM,
      profileCompleted: true,
      currency: 'PEN',
      consentGiven: true,
      consentAt: dim(4, 5),
      notificationPrefs: Object.fromEntries(
        Object.values(NotificationType).map((type) => [type, true]),
      ),
    },
  });
  return user.id;
}

/** Insert transactions: last 3 full months + a partial current month. */
async function seedTransactions(userId: string, categoryMap: Map<string, string>): Promise<void> {
  const insert = async (monthsAgo: number, t: TxTemplate): Promise<void> => {
    await prisma.transaction.create({
      data: {
        userId,
        categoryId: categoryMap.get(t.categoryName) ?? null,
        type: t.type,
        amount: t.amount,
        currency: 'PEN',
        description: t.description,
        occurredAt: dim(monthsAgo, t.day),
      },
    });
  };

  for (const monthsAgo of [3, 2, 1]) {
    for (const t of monthlyTransactions()) await insert(monthsAgo, t);
  }
  // Current month: only entries up to today, so the month looks "in progress".
  for (const t of monthlyTransactions()) {
    if (t.day <= TODAY_DAY) await insert(0, t);
  }
}

/** Two goals in progress + one already completed (exercises completedAt). */
async function seedGoals(userId: string): Promise<void> {
  // Clamp a contribution day so a current-month contribution never lands in
  // the future (e.g. day 5 when today is the 2nd).
  const contribDay = (monthsAgo: number, preferred: number): number =>
    monthsAgo === 0 ? Math.min(preferred, TODAY_DAY) : preferred;

  const trip = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Viaje a Cusco y Machu Picchu',
      targetAmount: 2000,
      currentAmount: 650,
      dueDate: dim(-6, 15),
      createdAt: dim(4, 5),
    },
  });
  for (const [m, amt] of [[3, 200], [2, 150], [1, 150], [0, 150]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: trip.id, amount: amt, createdAt: dim(m, contribDay(m, 5)) } });
  }

  const laptop = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Laptop nueva – MacBook Air',
      targetAmount: 3000,
      currentAmount: 1200,
      dueDate: dim(-4, 1),
      createdAt: dim(4, 1),
    },
  });
  for (const [m, amt] of [[3, 300], [2, 300], [1, 300], [0, 300]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: laptop.id, amount: amt, createdAt: dim(m, contribDay(m, 5)) } });
  }

  // Completed last month — set completedAt explicitly (US-045 / ARCH-05).
  const emergency = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Fondo de emergencia',
      targetAmount: 1000,
      currentAmount: 1000,
      dueDate: null,
      completedAt: dim(1, 20),
      createdAt: dim(4, 3),
    },
  });
  for (const [m, amt] of [[3, 300], [2, 300], [1, 400]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: emergency.id, amount: amt, createdAt: dim(m, 3) } });
  }
}

/** Monthly overall budget + per-category budgets across the seeded months. */
async function seedBudgets(userId: string, categoryMap: Map<string, string>): Promise<void> {
  const defs: Array<{ categoryName: string | null; amountLimit: number }> = [
    { categoryName: null, amountLimit: 1500 }, // overall monthly cap
    { categoryName: 'Food', amountLimit: 300 },
    { categoryName: 'Entertainment', amountLimit: 150 },
    { categoryName: 'Shopping', amountLimit: 200 },
  ];
  for (const monthsAgo of [3, 2, 1, 0]) {
    const { year, month } = ym(monthsAgo);
    for (const def of defs) {
      const categoryId = def.categoryName ? (categoryMap.get(def.categoryName) ?? null) : null;
      await prisma.budget.create({
        data: { userId, categoryId, amountLimit: def.amountLimit, month, year },
      });
    }
  }
}

/** Mark a few education topics complete (with a quiz score). */
async function seedTopicProgress(userId: string): Promise<void> {
  const completedTitles = [
    'Presupuesto personal',
    'Hábitos de ahorro',
    'Consumo responsable',
    'Billeteras digitales en Perú',
  ];
  const topics = await prisma.educationalTopic.findMany({ select: { id: true, title: true } });
  for (const topic of topics) {
    const done = completedTitles.includes(topic.title);
    await prisma.userTopicProgress.create({
      data: {
        userId,
        topicId: topic.id,
        completedAt: done ? dim(2, 15) : null,
        score: done ? 85 : null,
        attemptsCount: done ? 1 : 0,
      },
    });
  }
}

/**
 * Assign challenges to showcase every status:
 *   - two COMPLETED, one ACTIVE (accepted this month),
 *   - one EXPIRED (accepted long ago, never completed — if the challenge
 *     has a duration window in its criteriaJson, the API derives EXPIRED).
 * A challenge left unassigned stays AVAILABLE in the catalog.
 */
async function seedChallenges(userId: string): Promise<void> {
  const assignments: Array<{ title: string; acceptedAt?: Date; completedAt?: Date }> = [
    { title: 'Registra tus gastos 7 días seguidos', acceptedAt: dim(3, 10), completedAt: dim(3, 17) },
    { title: 'Ahorra S/20 esta semana', acceptedAt: dim(2, 1), completedAt: dim(2, 7) },
    { title: 'Sin delivery por 3 días', acceptedAt: dim(2, 15) },
    { title: 'Reduce tus gastos de ocio en 10%', acceptedAt: dim(0, 2) },
  ];
  for (const a of assignments) {
    const challenge = await prisma.challenge.findFirst({ where: { title: a.title }, select: { id: true } });
    if (!challenge) continue;
    await prisma.userChallenge.create({
      data: {
        userId,
        challengeId: challenge.id,
        acceptedAt: a.acceptedAt ?? null,
        completedAt: a.completedAt ?? null,
      },
    });
  }
}

/** Award a couple of earned badges. */
async function seedBadges(userId: string): Promise<void> {
  for (const name of ['First Transaction', 'Consistency']) {
    const badge = await prisma.badge.findFirst({ where: { name }, select: { id: true } });
    if (!badge) continue;
    await prisma.userBadge.create({ data: { userId, badgeId: badge.id, earnedAt: dim(2, 20) } });
  }
}

/** Last month's expense prediction (with accuracy) + this month's forecasts. */
async function seedPredictions(userId: string): Promise<void> {
  await prisma.prediction.create({
    data: {
      userId,
      period: period(1),
      type: TransactionType.EXPENSE,
      predictedTotal: 1175,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 450 },
        { categoryName: 'Food', amount: 205 },
        { categoryName: 'Transportation', amount: 75 },
        { categoryName: 'Utilities', amount: 95 },
        { categoryName: 'Entertainment', amount: 83 },
        { categoryName: 'Shopping', amount: 145 },
        { categoryName: 'Subscriptions', amount: 35.8 },
        { categoryName: 'Cravings', amount: 63.5 },
      ],
      confidenceLevel: 'high',
      confidenceInterval: { lower: 1050, upper: 1300 },
      narrative: 'Tu gasto se mantiene estable mes a mes; la mayor parte se va en alquiler y comida.',
      modelVersion: 'v1.0-demo',
      actualTotal: 1152.2,
      accuracy: 98.1,
    },
  });

  await prisma.prediction.create({
    data: {
      userId,
      period: period(0),
      type: TransactionType.EXPENSE,
      predictedTotal: 1180,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 450 },
        { categoryName: 'Food', amount: 210 },
        { categoryName: 'Transportation', amount: 75 },
        { categoryName: 'Utilities', amount: 95 },
        { categoryName: 'Entertainment', amount: 85 },
        { categoryName: 'Shopping', amount: 145 },
        { categoryName: 'Subscriptions', amount: 35.8 },
        { categoryName: 'Cravings', amount: 64 },
      ],
      confidenceLevel: 'medium',
      confidenceInterval: { lower: 1050, upper: 1320 },
      narrative: 'Vas en línea con tu promedio. Vigila Entretenimiento, que suele subir a fin de mes.',
      modelVersion: 'v1.0-demo',
    },
  });

  await prisma.prediction.create({
    data: {
      userId,
      period: period(0),
      type: TransactionType.INCOME,
      predictedTotal: 1500,
      predictedByCategory: [{ categoryName: 'Part-time work', amount: 1500 }],
      confidenceLevel: 'high',
      confidenceInterval: { lower: 1450, upper: 1550 },
      narrative: 'Tu ingreso part-time es constante.',
      modelVersion: 'v1.0-demo',
    },
  });
}

/** Coherent AI recommendations (Spanish), one already viewed. */
async function seedRecommendations(userId: string): Promise<void> {
  await prisma.recommendation.create({
    data: {
      userId,
      type: RecommendationType.BUDGET,
      message: 'El mes pasado gastaste S/205 en Comida, dentro de tu presupuesto de S/300. ¡Buen control!',
      suggestedAction: 'Si te sientes cómoda, baja tu presupuesto de Comida a S/280 y manda la diferencia al ahorro.',
      isActive: true,
      source: 'local-rules',
      modelVersion: 'rules-v1',
      viewedAt: dim(0, Math.max(1, TODAY_DAY - 1)),
    },
  });
  await prisma.recommendation.create({
    data: {
      userId,
      type: RecommendationType.SAVINGS,
      message: 'Vas camino a tu meta "Laptop nueva" para agosto. Aportar S/50 extra al mes la adelantaría unas 3 semanas.',
      suggestedAction: 'Agrega S/50 a tu próxima contribución de la meta Laptop nueva.',
      isActive: true,
      source: 'local-rules',
      modelVersion: 'rules-v1',
    },
  });
  await prisma.recommendation.create({
    data: {
      userId,
      type: RecommendationType.GOAL,
      message: '¡Felicidades! Completaste tu Fondo de emergencia de S/1,000. Tener un colchón te protege de imprevistos.',
      suggestedAction: 'Define una nueva meta para seguir el impulso, por ejemplo un fondo para tus estudios.',
      isActive: true,
      source: 'local-rules',
      modelVersion: 'rules-v1',
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n── Zenda Demo Seed (single user) ───────────────────────');

  await ensureSystemCategories();
  const categoryMap = await getCategoryMap();
  console.log(`  System categories ready (${categoryMap.size}).`);

  await resetDemoUser();
  const passwordHash = await hash(DEMO_PASSWORD);
  const userId = await createDemoUser(passwordHash);
  console.log('  Demo user created.');

  await seedTransactions(userId, categoryMap);
  await seedGoals(userId);
  await seedBudgets(userId, categoryMap);
  await seedTopicProgress(userId);
  await seedChallenges(userId);
  await seedBadges(userId);
  await seedPredictions(userId);
  await seedRecommendations(userId);

  console.log('\n── Demo seed complete ──────────────────────────────────');
  console.log(`  Login:  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
  console.log('  Ana García — part-time worker, balanced spender, MEDIUM literacy');
  console.log('  3 full months + partial current month of activity across every feature.');
  console.log('────────────────────────────────────────────────────────\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
