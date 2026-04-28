/**
 * seed.demo.ts — Demo data for Zenda (WalletWise) thesis testing
 *
 * Creates 3 demo users with 3+ months of realistic financial history:
 *   1. Ana García     – part-time worker, balanced spender  (MEDIUM literacy)
 *   2. Carlos Mendoza – family-funded,   overspends on wants (LOW literacy)
 *   3. Lucía Torres   – scholarship,      disciplined saver   (HIGH literacy)
 *
 * Run: npx ts-node prisma/seed.demo.ts
 * Or:  npm run prisma:seed:demo
 *
 * Safe to re-run — all operations check for existence before inserting.
 */

import {
  CategoryType,
  FinancialLiteracyLevel,
  IncomeType,
  NotificationType,
  PrismaClient,
  RecommendationType,
  TransactionType,
  UserChallengeStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Build a UTC date from explicit year/month (1-based)/day */
function d(year: number, month: number, day: number, hour = 10): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
}

/** Hash a plain-text password with bcrypt (cost 10) */
async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// ─────────────────────────────────────────────────────────────────
// DEMO USER DEFINITIONS
// ─────────────────────────────────────────────────────────────────

/**
 * All demo accounts share the password:  Demo1234!
 * Emails use the @zenda.demo domain so they are clearly non-production.
 */
const DEMO_PASSWORD = 'Demo1234!';

interface DemoUserDef {
  email: string;
  fullName: string;
  age: number;
  university: string;
  incomeType: IncomeType;
  averageMonthlyIncome: number;
  financialLiteracyLevel: FinancialLiteracyLevel;
}

const DEMO_USER_DEFS: DemoUserDef[] = [
  {
    email: 'ana.garcia@zenda.demo',
    fullName: 'Ana García',
    age: 20,
    university: 'Universidad Nacional Mayor de San Marcos',
    incomeType: IncomeType.PART_TIME,
    averageMonthlyIncome: 1500,
    financialLiteracyLevel: FinancialLiteracyLevel.MEDIUM,
  },
  {
    email: 'carlos.mendoza@zenda.demo',
    fullName: 'Carlos Mendoza',
    age: 22,
    university: 'Universidad Peruana de Ciencias Aplicadas',
    incomeType: IncomeType.FAMILY,
    averageMonthlyIncome: 2200,
    financialLiteracyLevel: FinancialLiteracyLevel.LOW,
  },
  {
    email: 'lucia.torres@zenda.demo',
    fullName: 'Lucía Torres',
    age: 19,
    university: 'Pontificia Universidad Católica del Perú',
    incomeType: IncomeType.SCHOLARSHIP,
    averageMonthlyIncome: 900,
    financialLiteracyLevel: FinancialLiteracyLevel.HIGH,
  },
];

// ─────────────────────────────────────────────────────────────────
// TRANSACTION TEMPLATES
// ─────────────────────────────────────────────────────────────────

interface TxTemplate {
  categoryName: string;
  type: TransactionType;
  amount: number;
  description: string;
  day: number; // day of month
}

/**
 * Ana García — balanced 50/30/20 spender
 * Monthly income: S/1,500  |  Needs ~S/750  |  Wants ~S/450  |  Savings ~S/300
 */
function anaTransactions(year: number, month: number): TxTemplate[] {
  return [
    // ── Income ──────────────────────────────────────────────────
    { categoryName: 'Part-time work', type: TransactionType.INCOME, amount: 1500.0, description: 'Monthly part-time salary – Tienda Ripley', day: 1 },
    // ── Needs ───────────────────────────────────────────────────
    { categoryName: 'Housing', type: TransactionType.EXPENSE, amount: 450.0, description: 'Monthly rent – shared flat San Isidro', day: 2 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 85.0, description: 'Weekly groceries – Metro supermarket', day: 3 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 75.0, description: 'Monthly bus pass – Lima Metro card top-up', day: 4 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 55.0, description: 'Internet – Claro home plan', day: 5 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 65.0, description: 'Weekly groceries – Vivanda', day: 10 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 40.0, description: 'Electricity bill – Luz del Sur', day: 12 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 28.0, description: 'Pharmacy – vitamins and pain relief', day: 14 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 72.0, description: 'Weekly groceries – Wong', day: 17 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 58.0, description: 'Weekly groceries – Metro supermarket', day: 24 },
    // ── Wants ───────────────────────────────────────────────────
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 22.9, description: 'Netflix monthly plan', day: 6 },
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 12.9, description: 'Spotify Premium', day: 6 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 38.0, description: 'Cinema – Cineplanet with friends', day: 8 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 35.0, description: 'Rappi delivery – sushi dinner', day: 13 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 89.9, description: 'Clothes – Zara Miraflores', day: 15 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 45.0, description: 'Concert tickets – live music night', day: 20 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 28.5, description: 'Starbucks – coffee runs this week', day: 22 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 55.0, description: 'Books and stationery – SBS Librería', day: 27 },
    // ── Savings ─────────────────────────────────────────────────
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 300.0, description: 'Monthly savings transfer – Savings goal', day: 1 },
  ];
}

/**
 * Carlos Mendoza — overspender on wants, low literacy
 * Monthly income: S/2,200  |  Needs ~S/900  |  Wants ~S/1,050  |  Savings ~S/250
 */
function carlosTransactions(year: number, month: number): TxTemplate[] {
  return [
    // ── Income ──────────────────────────────────────────────────
    { categoryName: 'Family', type: TransactionType.INCOME, amount: 2200.0, description: 'Monthly allowance from parents', day: 1 },
    // ── Needs ───────────────────────────────────────────────────
    { categoryName: 'Housing', type: TransactionType.EXPENSE, amount: 600.0, description: 'Monthly rent – apartment San Borja', day: 2 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 95.0, description: 'Groceries – Metro supermarket', day: 4 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 100.0, description: 'Uber rides + bus pass', day: 5 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 65.0, description: 'Internet – Movistar fiber', day: 6 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 55.0, description: 'Electricity bill', day: 12 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 80.0, description: 'Groceries – Vivanda premium', day: 15 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 50.0, description: 'Medical consultation + pharmacy', day: 18 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 75.0, description: 'Groceries – Wong', day: 22 },
    // ── Wants (OVERSPENDING) ─────────────────────────────────────
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 22.9, description: 'Netflix', day: 6 },
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 12.9, description: 'Spotify Premium', day: 6 },
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 35.0, description: 'Xbox Game Pass Ultimate', day: 6 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 120.0, description: 'Night out – Bar crawl Barranco', day: 7 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 85.0, description: 'Rappi – multiple food deliveries', day: 9 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 199.9, description: 'Sneakers – Nike store Jockey Plaza', day: 11 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 95.0, description: 'Escape room + bowling – friends', day: 14 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 65.0, description: 'PedidosYa – weekly food delivery habit', day: 16 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 80.0, description: 'Club entry and drinks – Friday night', day: 19 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 150.0, description: 'Gadget accessories – gaming gear', day: 21 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 55.0, description: 'Starbucks + desserts throughout week', day: 23 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 70.0, description: 'Sports event tickets', day: 25 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 89.0, description: 'Clothing – H&M sale', day: 28 },
    // ── Savings (minimal) ────────────────────────────────────────
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 100.0, description: 'Savings (when I remember)', day: 25 },
  ];
}

/**
 * Lucía Torres — disciplined saver, high literacy
 * Monthly income: S/900  |  Needs ~S/430  |  Wants ~S/200  |  Savings ~S/270
 */
function luciaTransactions(year: number, month: number): TxTemplate[] {
  return [
    // ── Income ──────────────────────────────────────────────────
    { categoryName: 'Scholarship', type: TransactionType.INCOME, amount: 900.0, description: 'Monthly PRONABEC scholarship disbursement', day: 1 },
    // ── Needs ───────────────────────────────────────────────────
    { categoryName: 'Housing', type: TransactionType.EXPENSE, amount: 200.0, description: 'Shared room rent – Miraflores hostel', day: 2 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 45.0, description: 'Weekly groceries – Metro', day: 3 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 60.0, description: 'Bus pass + Metropolitano card', day: 4 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 25.0, description: 'Shared internet contribution', day: 5 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 40.0, description: 'Weekly groceries – market', day: 10 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 20.0, description: 'Shared electricity', day: 12 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 38.0, description: 'Weekly groceries – Mini market', day: 17 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 18.0, description: 'Pharmacy – basic medicines', day: 19 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 35.0, description: 'Weekly groceries – Metro', day: 24 },
    // ── Education (Needs) ────────────────────────────────────────
    { categoryName: 'Education', type: TransactionType.EXPENSE, amount: 45.0, description: 'University printing + materials', day: 8 },
    // ── Wants (controlled) ──────────────────────────────────────
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 12.9, description: 'Spotify Student plan', day: 6 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 28.0, description: 'Cinema + museum visit', day: 9 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 18.0, description: 'Coffee shop study session', day: 13 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 55.0, description: 'Second-hand books – SBS feria', day: 16 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 25.0, description: 'Free-entry event + transport', day: 23 },
    // ── Savings (strict) ─────────────────────────────────────────
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 200.0, description: 'Monthly savings – Study abroad fund', day: 1 },
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 70.0, description: 'Extra savings – phone goal', day: 15 },
  ];
}

// ─────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/** Ensure all system categories exist (mirrors main seed.ts) */
async function ensureSystemCategories(): Promise<void> {
  const expenseNames = [
    'Food', 'Transportation', 'Housing', 'Utilities', 'Health',
    'Entertainment', 'Shopping', 'Subscriptions', 'Cravings',
    'Savings', 'Education', 'Other',
  ];
  const incomeNames = ['Scholarship', 'Part-time work', 'Family', 'Freelance', 'Other'];

  for (const name of expenseNames) {
    const exists = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: CategoryType.SYSTEM, deletedAt: null },
    });
    if (!exists) {
      await prisma.category.create({
        data: { name, type: CategoryType.SYSTEM, transactionType: TransactionType.EXPENSE },
      });
    }
  }
  for (const name of incomeNames) {
    const exists = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: CategoryType.SYSTEM, deletedAt: null },
    });
    if (!exists) {
      await prisma.category.create({
        data: { name, type: CategoryType.SYSTEM, transactionType: TransactionType.INCOME },
      });
    }
  }
}

/** Fetch all system categories into a name→id lookup map */
async function getCategoryMap(): Promise<Map<string, string>> {
  const cats = await prisma.category.findMany({
    where: { type: CategoryType.SYSTEM, deletedAt: null },
    select: { id: true, name: true },
  });
  return new Map(cats.map((c) => [c.name, c.id]));
}

/** Create a demo user if not yet present; return the user id */
async function upsertDemoUser(def: DemoUserDef, passwordHash: string): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { email: def.email, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const user = await prisma.user.create({
    data: {
      email: def.email,
      fullName: def.fullName,
      passwordHash,
      age: def.age,
      university: def.university,
      incomeType: def.incomeType,
      averageMonthlyIncome: def.averageMonthlyIncome,
      financialLiteracyLevel: def.financialLiteracyLevel,
      profileCompleted: true,
      currency: 'PEN',
      consentGiven: true,
      consentAt: d(2026, 1, 5),
    },
  });
  return user.id;
}

/** Insert transactions for a user across multiple months */
async function seedTransactions(
  userId: string,
  categoryMap: Map<string, string>,
  templatesFn: (year: number, month: number) => TxTemplate[],
  months: Array<{ year: number; month: number }>,
): Promise<void> {
  for (const { year, month } of months) {
    const templates = templatesFn(year, month);
    for (const t of templates) {
      const categoryId = categoryMap.get(t.categoryName) ?? null;
      await prisma.transaction.create({
        data: {
          userId,
          categoryId,
          type: t.type,
          amount: t.amount,
          currency: 'PEN',
          description: t.description,
          occurredAt: d(year, month, t.day),
        },
      });
    }
  }
}

/** Create savings goals for Ana García */
async function seedAnaGoals(userId: string): Promise<void> {
  // Goal 1 — Summer trip (25% progress)
  const trip = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Summer Trip – Cusco & Machu Picchu',
      targetAmount: 2000,
      currentAmount: 500,
      dueDate: d(2026, 12, 15),
      createdAt: d(2026, 1, 5),
    },
  });
  for (const [mo, amt] of [[1, 200], [2, 150], [3, 150]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: trip.id, amount: amt, createdAt: d(2026, mo, 28) } });
  }

  // Goal 2 — Laptop upgrade (40% progress)
  const laptop = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Laptop Upgrade – MacBook Air',
      targetAmount: 3000,
      currentAmount: 1200,
      dueDate: d(2026, 8, 1),
      createdAt: d(2025, 10, 1),
    },
  });
  for (const [mo, amt] of [[1, 300], [2, 300], [3, 300]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: laptop.id, amount: amt, createdAt: d(2026, mo, 5) } });
  }

  // Goal 3 — Emergency fund (18% progress)
  const emergency = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Emergency Fund',
      targetAmount: 5000,
      currentAmount: 900,
      dueDate: null,
      createdAt: d(2026, 1, 1),
    },
  });
  for (const [mo, amt] of [[1, 200], [2, 250], [3, 250], [4, 200]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: emergency.id, amount: amt, createdAt: d(2026, mo, 3) } });
  }
}

/** Create savings goals for Carlos Mendoza */
async function seedCarlosGoals(userId: string): Promise<void> {
  // Goal — Emergency fund (barely started)
  const emergency = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Emergency Fund (someday)',
      targetAmount: 3000,
      currentAmount: 300,
      dueDate: null,
      createdAt: d(2026, 2, 10),
    },
  });
  for (const [mo, amt] of [[2, 100], [3, 100], [4, 100]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: emergency.id, amount: amt, createdAt: d(2026, mo, 25) } });
  }

  // Goal — Trip with friends (barely touched)
  const trip = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Trip to Arequipa',
      targetAmount: 1500,
      currentAmount: 150,
      dueDate: d(2026, 7, 1),
      createdAt: d(2026, 3, 1),
    },
  });
  await prisma.goalContribution.create({ data: { goalId: trip.id, amount: 150, createdAt: d(2026, 3, 15) } });
}

/** Create savings goals for Lucía Torres */
async function seedLuciaGoals(userId: string): Promise<void> {
  // Goal 1 — Study abroad fund (67% progress — she's serious)
  const abroad = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'Study Abroad Fund – Exchange Program',
      targetAmount: 6000,
      currentAmount: 4020,
      dueDate: d(2026, 9, 1),
      createdAt: d(2025, 7, 1),
    },
  });
  for (const [mo, amt] of [[1, 200], [2, 200], [3, 200]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: abroad.id, amount: amt, createdAt: d(2026, mo, 5) } });
  }

  // Goal 2 — New phone (nearly complete)
  const phone = await prisma.savingsGoal.create({
    data: {
      userId,
      name: 'New Smartphone – Pixel 9',
      targetAmount: 1200,
      currentAmount: 980,
      dueDate: d(2026, 5, 1),
      createdAt: d(2026, 1, 1),
    },
  });
  for (const [mo, amt] of [[1, 70], [2, 70], [3, 70], [4, 70]] as [number, number][]) {
    await prisma.goalContribution.create({ data: { goalId: phone.id, amount: amt, createdAt: d(2026, mo, 15) } });
  }
}

/** Create budgets for a user across months */
async function seedBudgets(
  userId: string,
  categoryMap: Map<string, string>,
  defs: Array<{ categoryName: string | null; amountLimit: number; month: number; year: number }>,
): Promise<void> {
  for (const b of defs) {
    const categoryId = b.categoryName ? (categoryMap.get(b.categoryName) ?? null) : null;
    const exists = await prisma.budget.findFirst({
      where: { userId, categoryId: categoryId ?? null, month: b.month, year: b.year, deletedAt: null },
    });
    if (!exists) {
      await prisma.budget.create({
        data: { userId, categoryId, amountLimit: b.amountLimit, month: b.month, year: b.year },
      });
    }
  }
}

/** Seed notification preferences for a user (all types enabled) */
async function seedNotificationPreferences(userId: string): Promise<void> {
  for (const type of Object.values(NotificationType)) {
    const exists = await prisma.notificationPreference.findFirst({ where: { userId, type } });
    if (!exists) {
      await prisma.notificationPreference.create({ data: { userId, type, enabled: true } });
    }
  }
}

/** Seed educational topic progress */
async function seedTopicProgress(
  userId: string,
  completedTitles: string[],
): Promise<void> {
  const topics = await prisma.educationalTopic.findMany({ select: { id: true, title: true } });
  for (const topic of topics) {
    const isCompleted = completedTitles.includes(topic.title);
    const exists = await prisma.userTopicProgress.findFirst({ where: { userId, topicId: topic.id } });
    if (!exists) {
      await prisma.userTopicProgress.create({
        data: {
          userId,
          topicId: topic.id,
          completedAt: isCompleted ? d(2026, 2, 15) : null,
        },
      });
    }
  }
}

/** Seed challenge assignments for a user */
async function seedChallenges(
  userId: string,
  assignments: Array<{ title: string; status: UserChallengeStatus; acceptedAt?: Date; completedAt?: Date }>,
): Promise<void> {
  for (const a of assignments) {
    const challenge = await prisma.challenge.findFirst({ where: { title: a.title } });
    if (!challenge) continue;
    const exists = await prisma.userChallenge.findFirst({ where: { userId, challengeId: challenge.id } });
    if (!exists) {
      await prisma.userChallenge.create({
        data: {
          userId,
          challengeId: challenge.id,
          status: a.status,
          acceptedAt: a.acceptedAt ?? null,
          completedAt: a.completedAt ?? null,
        },
      });
    }
  }
}

/** Award badges to a user */
async function seedBadges(
  userId: string,
  badgeNames: string[],
): Promise<void> {
  for (const name of badgeNames) {
    const badge = await prisma.badge.findFirst({ where: { name } });
    if (!badge) continue;
    const exists = await prisma.userBadge.findFirst({ where: { userId, badgeId: badge.id } });
    if (!exists) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id, earnedAt: d(2026, 2, 20) } });
    }
  }
}

/** Seed AI predictions for a user (current and past periods) */
async function seedPredictions(
  userId: string,
  predictions: Array<{
    period: string;
    type: TransactionType;
    predictedTotal: number;
    predictedByCategory: object;
    confidenceInterval: { lower: number; upper: number };
    actualTotal?: number;
    accuracy?: number;
  }>,
): Promise<void> {
  for (const p of predictions) {
    const exists = await prisma.prediction.findFirst({ where: { userId, period: p.period, type: p.type } });
    if (!exists) {
      await prisma.prediction.create({
        data: {
          userId,
          period: p.period,
          type: p.type,
          predictedTotal: p.predictedTotal,
          predictedByCategory: p.predictedByCategory,
          confidenceInterval: p.confidenceInterval,
          modelVersion: 'v1.0-demo',
          actualTotal: p.actualTotal ?? null,
          accuracy: p.accuracy ?? null,
        },
      });
    }
  }
}

/** Seed AI recommendations for a user */
async function seedRecommendations(
  userId: string,
  recs: Array<{ type: RecommendationType; message: string; suggestedAction?: string }>,
): Promise<void> {
  for (const r of recs) {
    await prisma.recommendation.create({
      data: { userId, type: r.type, message: r.message, suggestedAction: r.suggestedAction ?? null, isActive: true },
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN DEMO SEED
// ─────────────────────────────────────────────────────────────────

const SEED_MONTHS = [
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
];

/** Partial April data (only first 10 days) */
const APR_MONTHS = [{ year: 2026, month: 4 }];

async function seedAna(categoryMap: Map<string, string>): Promise<void> {
  const [def] = DEMO_USER_DEFS;
  const pwHash = await hash(DEMO_PASSWORD);
  const userId = await upsertDemoUser(def, pwHash);

  // Full January–March transactions + partial April
  await seedTransactions(userId, categoryMap, anaTransactions, SEED_MONTHS);

  // April partial (income only + a few early expenses)
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Part-time work'), type: TransactionType.INCOME, amount: 1500, currency: 'PEN', description: 'Monthly part-time salary – Tienda Ripley', occurredAt: d(2026, 4, 1) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Housing'), type: TransactionType.EXPENSE, amount: 450, currency: 'PEN', description: 'Monthly rent – shared flat San Isidro', occurredAt: d(2026, 4, 2) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Subscriptions'), type: TransactionType.EXPENSE, amount: 22.9, currency: 'PEN', description: 'Netflix monthly plan', occurredAt: d(2026, 4, 6) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Food'), type: TransactionType.EXPENSE, amount: 82.5, currency: 'PEN', description: 'Weekly groceries – Metro', occurredAt: d(2026, 4, 7) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Transportation'), type: TransactionType.EXPENSE, amount: 75, currency: 'PEN', description: 'Monthly bus pass top-up', occurredAt: d(2026, 4, 4) },
  });

  await seedAnaGoals(userId);

  await seedBudgets(userId, categoryMap, [
    { categoryName: null, amountLimit: 1500, month: 1, year: 2026 },
    { categoryName: null, amountLimit: 1500, month: 2, year: 2026 },
    { categoryName: null, amountLimit: 1500, month: 3, year: 2026 },
    { categoryName: null, amountLimit: 1500, month: 4, year: 2026 },
    { categoryName: 'Food', amountLimit: 300, month: 1, year: 2026 },
    { categoryName: 'Food', amountLimit: 300, month: 2, year: 2026 },
    { categoryName: 'Food', amountLimit: 300, month: 3, year: 2026 },
    { categoryName: 'Food', amountLimit: 300, month: 4, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 150, month: 1, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 150, month: 2, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 150, month: 3, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 150, month: 4, year: 2026 },
    { categoryName: 'Shopping', amountLimit: 200, month: 3, year: 2026 },
    { categoryName: 'Shopping', amountLimit: 200, month: 4, year: 2026 },
  ]);

  await seedNotificationPreferences(userId);

  await seedTopicProgress(userId, [
    'Personal Budget',
    'Savings Habits',
    'Responsible Consumption',
    'Digital Wallets in Peru',
  ]);

  await seedChallenges(userId, [
    { title: 'Record expenses for 7 consecutive days', status: UserChallengeStatus.COMPLETED, acceptedAt: d(2026, 1, 10), completedAt: d(2026, 1, 17) },
    { title: 'Save S/20 this week', status: UserChallengeStatus.COMPLETED, acceptedAt: d(2026, 2, 1), completedAt: d(2026, 2, 7) },
    { title: 'No delivery spending for 3 days', status: UserChallengeStatus.ACTIVE, acceptedAt: d(2026, 4, 8) },
    { title: 'Reduce entertainment spending by 10%', status: UserChallengeStatus.AVAILABLE },
  ]);

  await seedBadges(userId, ['First Transaction', 'Consistency']);

  await seedPredictions(userId, [
    {
      period: '2026-03',
      type: TransactionType.EXPENSE,
      predictedTotal: 1175,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 450 },
        { categoryName: 'Food', amount: 280 },
        { categoryName: 'Transportation', amount: 75 },
        { categoryName: 'Utilities', amount: 95 },
        { categoryName: 'Entertainment', amount: 85 },
        { categoryName: 'Shopping', amount: 145 },
        { categoryName: 'Subscriptions', amount: 35.8 },
        { categoryName: 'Cravings', amount: 55 },
      ],
      confidenceInterval: { lower: 1050, upper: 1300 },
      actualTotal: 1197.2,
      accuracy: 98.1,
    },
    {
      period: '2026-04',
      type: TransactionType.EXPENSE,
      predictedTotal: 1190,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 450 },
        { categoryName: 'Food', amount: 285 },
        { categoryName: 'Transportation', amount: 75 },
        { categoryName: 'Utilities', amount: 95 },
        { categoryName: 'Entertainment', amount: 90 },
        { categoryName: 'Shopping', amount: 140 },
        { categoryName: 'Subscriptions', amount: 35.8 },
        { categoryName: 'Cravings', amount: 60 },
      ],
      confidenceInterval: { lower: 1050, upper: 1330 },
    },
    {
      period: '2026-04',
      type: TransactionType.INCOME,
      predictedTotal: 1500,
      predictedByCategory: [{ categoryName: 'Part-time work', amount: 1500 }],
      confidenceInterval: { lower: 1400, upper: 1600 },
    },
  ]);

  await seedRecommendations(userId, [
    {
      type: RecommendationType.BUDGET,
      message: 'Your Food spending was S/280 last month — well within your S/300 budget. Keep it up!',
      suggestedAction: 'Review your Food budget next month to see if you can lower it to S/280.',
    },
    {
      type: RecommendationType.SAVINGS,
      message: 'You are on track to reach your Laptop goal by August. Contributing an extra S/50/month would bring it forward by 3 weeks.',
      suggestedAction: 'Add S/50 to your Laptop Upgrade goal contribution.',
    },
  ]);

  console.log(`✓ Ana García seeded  (${def.email})`);
}

async function seedCarlos(categoryMap: Map<string, string>): Promise<void> {
  const def = DEMO_USER_DEFS[1];
  const pwHash = await hash(DEMO_PASSWORD);
  const userId = await upsertDemoUser(def, pwHash);

  await seedTransactions(userId, categoryMap, carlosTransactions, SEED_MONTHS);

  // April partial
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Family'), type: TransactionType.INCOME, amount: 2200, currency: 'PEN', description: 'Monthly allowance from parents', occurredAt: d(2026, 4, 1) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Housing'), type: TransactionType.EXPENSE, amount: 600, currency: 'PEN', description: 'Monthly rent', occurredAt: d(2026, 4, 2) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Entertainment'), type: TransactionType.EXPENSE, amount: 135, currency: 'PEN', description: 'Night out – La Noche de Barranco', occurredAt: d(2026, 4, 5) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Cravings'), type: TransactionType.EXPENSE, amount: 78, currency: 'PEN', description: 'Rappi deliveries', occurredAt: d(2026, 4, 9) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Shopping'), type: TransactionType.EXPENSE, amount: 220, currency: 'PEN', description: 'Clothes haul – Jockey Plaza', occurredAt: d(2026, 4, 11) },
  });

  await seedCarlosGoals(userId);

  await seedBudgets(userId, categoryMap, [
    { categoryName: null, amountLimit: 2200, month: 1, year: 2026 },
    { categoryName: null, amountLimit: 2200, month: 2, year: 2026 },
    { categoryName: null, amountLimit: 2200, month: 3, year: 2026 },
    { categoryName: null, amountLimit: 2200, month: 4, year: 2026 },
    // Category budgets — he regularly exceeds Entertainment and Shopping
    { categoryName: 'Entertainment', amountLimit: 200, month: 3, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 200, month: 4, year: 2026 },
    { categoryName: 'Shopping', amountLimit: 300, month: 4, year: 2026 },
  ]);

  await seedNotificationPreferences(userId);

  // Very little educational progress — he just registered
  await seedTopicProgress(userId, ['Personal Budget']);

  await seedChallenges(userId, [
    { title: 'Record expenses for 7 consecutive days', status: UserChallengeStatus.ACTIVE, acceptedAt: d(2026, 4, 6) },
    { title: 'Reduce entertainment spending by 10%', status: UserChallengeStatus.AVAILABLE },
  ]);

  await seedBadges(userId, ['First Transaction']);

  await seedPredictions(userId, [
    {
      period: '2026-04',
      type: TransactionType.EXPENSE,
      predictedTotal: 2015,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 600 },
        { categoryName: 'Food', amount: 250 },
        { categoryName: 'Transportation', amount: 100 },
        { categoryName: 'Utilities', amount: 120 },
        { categoryName: 'Entertainment', amount: 365 },
        { categoryName: 'Cravings', amount: 200 },
        { categoryName: 'Shopping', amount: 300 },
        { categoryName: 'Subscriptions', amount: 70.8 },
      ],
      confidenceInterval: { lower: 1800, upper: 2300 },
    },
    {
      period: '2026-04',
      type: TransactionType.INCOME,
      predictedTotal: 2200,
      predictedByCategory: [{ categoryName: 'Family', amount: 2200 }],
      confidenceInterval: { lower: 2200, upper: 2200 },
    },
  ]);

  await seedRecommendations(userId, [
    {
      type: RecommendationType.BUDGET,
      message: 'You spent S/365 on Entertainment last month — 83% more than similar users your age. The 30% rule suggests a cap of S/660 for all wants combined.',
      suggestedAction: 'Set an Entertainment budget of S/200 for April.',
    },
    {
      type: RecommendationType.SAVINGS,
      message: 'At your current savings rate (S/100/month), your Emergency Fund goal will take 27 months. Saving S/300/month would cut that to 9 months.',
      suggestedAction: 'Increase your monthly savings contribution to S/300.',
    },
    {
      type: RecommendationType.GOAL,
      message: 'Your Arequipa trip goal has had only one contribution in 6 weeks. You may miss the July deadline at this pace.',
      suggestedAction: 'Set up a weekly auto-reminder to contribute S/50 to the trip goal.',
    },
  ]);

  console.log(`✓ Carlos Mendoza seeded  (${def.email})`);
}

async function seedLucia(categoryMap: Map<string, string>): Promise<void> {
  const def = DEMO_USER_DEFS[2];
  const pwHash = await hash(DEMO_PASSWORD);
  const userId = await upsertDemoUser(def, pwHash);

  await seedTransactions(userId, categoryMap, luciaTransactions, SEED_MONTHS);

  // April partial
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Scholarship'), type: TransactionType.INCOME, amount: 900, currency: 'PEN', description: 'Monthly PRONABEC scholarship disbursement', occurredAt: d(2026, 4, 1) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Savings'), type: TransactionType.EXPENSE, amount: 200, currency: 'PEN', description: 'Monthly savings – Study abroad fund', occurredAt: d(2026, 4, 1) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Housing'), type: TransactionType.EXPENSE, amount: 200, currency: 'PEN', description: 'Shared room rent', occurredAt: d(2026, 4, 2) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Food'), type: TransactionType.EXPENSE, amount: 43, currency: 'PEN', description: 'Weekly groceries – Metro', occurredAt: d(2026, 4, 7) },
  });
  await prisma.transaction.create({
    data: { userId, categoryId: categoryMap.get('Transportation'), type: TransactionType.EXPENSE, amount: 60, currency: 'PEN', description: 'Bus pass', occurredAt: d(2026, 4, 4) },
  });

  await seedLuciaGoals(userId);

  await seedBudgets(userId, categoryMap, [
    { categoryName: null, amountLimit: 900, month: 1, year: 2026 },
    { categoryName: null, amountLimit: 900, month: 2, year: 2026 },
    { categoryName: null, amountLimit: 900, month: 3, year: 2026 },
    { categoryName: null, amountLimit: 900, month: 4, year: 2026 },
    { categoryName: 'Food', amountLimit: 180, month: 1, year: 2026 },
    { categoryName: 'Food', amountLimit: 180, month: 2, year: 2026 },
    { categoryName: 'Food', amountLimit: 180, month: 3, year: 2026 },
    { categoryName: 'Food', amountLimit: 180, month: 4, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 60, month: 1, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 60, month: 2, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 60, month: 3, year: 2026 },
    { categoryName: 'Entertainment', amountLimit: 60, month: 4, year: 2026 },
  ]);

  await seedNotificationPreferences(userId);

  // Lucía has completed almost all topics
  await seedTopicProgress(userId, [
    'Personal Budget',
    'Savings Habits',
    'Credit and Debt',
    'Inflation',
    'Interest Rates',
    'Responsible Consumption',
    'Digital Wallets in Peru',
    // 'Basic Investing' — not yet, so she doesn't have the Financial Sage badge
  ]);

  await seedChallenges(userId, [
    { title: 'Record expenses for 7 consecutive days', status: UserChallengeStatus.COMPLETED, acceptedAt: d(2026, 1, 5), completedAt: d(2026, 1, 12) },
    { title: 'Save S/20 this week', status: UserChallengeStatus.COMPLETED, acceptedAt: d(2026, 1, 1), completedAt: d(2026, 1, 7) },
    { title: 'No delivery spending for 3 days', status: UserChallengeStatus.COMPLETED, acceptedAt: d(2026, 2, 10), completedAt: d(2026, 2, 13) },
    { title: 'Reduce entertainment spending by 10%', status: UserChallengeStatus.COMPLETED, acceptedAt: d(2026, 2, 20), completedAt: d(2026, 3, 20) },
  ]);

  await seedBadges(userId, ['First Transaction', 'Consistency', 'Challenger']);

  await seedPredictions(userId, [
    {
      period: '2026-03',
      type: TransactionType.EXPENSE,
      predictedTotal: 652,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 200 },
        { categoryName: 'Food', amount: 160 },
        { categoryName: 'Transportation', amount: 60 },
        { categoryName: 'Utilities', amount: 45 },
        { categoryName: 'Education', amount: 45 },
        { categoryName: 'Entertainment', amount: 53 },
        { categoryName: 'Cravings', amount: 18 },
        { categoryName: 'Shopping', amount: 55 },
        { categoryName: 'Subscriptions', amount: 12.9 },
      ],
      confidenceInterval: { lower: 600, upper: 720 },
      actualTotal: 629.9,
      accuracy: 96.4,
    },
    {
      period: '2026-04',
      type: TransactionType.EXPENSE,
      predictedTotal: 645,
      predictedByCategory: [
        { categoryName: 'Housing', amount: 200 },
        { categoryName: 'Food', amount: 158 },
        { categoryName: 'Transportation', amount: 60 },
        { categoryName: 'Utilities', amount: 45 },
        { categoryName: 'Education', amount: 45 },
        { categoryName: 'Entertainment', amount: 50 },
        { categoryName: 'Cravings', amount: 18 },
        { categoryName: 'Shopping', amount: 55 },
        { categoryName: 'Subscriptions', amount: 12.9 },
      ],
      confidenceInterval: { lower: 595, upper: 710 },
    },
    {
      period: '2026-04',
      type: TransactionType.INCOME,
      predictedTotal: 900,
      predictedByCategory: [{ categoryName: 'Scholarship', amount: 900 }],
      confidenceInterval: { lower: 900, upper: 900 },
    },
  ]);

  await seedRecommendations(userId, [
    {
      type: RecommendationType.SAVINGS,
      message: "You're 67% of the way to your Study Abroad goal — fantastic progress! At this rate you'll hit S/6,000 by August, one month ahead of schedule.",
      suggestedAction: "Keep your current savings pace. Consider topping up by S/50 in April to hit the target early.",
    },
    {
      type: RecommendationType.GOAL,
      message: 'Your Smartphone goal needs just S/220 more. You could reach it by end of May.',
      suggestedAction: 'Add S/110 in April and S/110 in May to complete your Pixel 9 goal.',
    },
  ]);

  console.log(`✓ Lucía Torres seeded  (${def.email})`);
}

// ─────────────────────────────────────────────────────────────────
// USER 4 — Diego Ramírez (irregular income, gig worker, 6 months)
// ─────────────────────────────────────────────────────────────────

function diegoTransactions(_year: number, _month: number): TxTemplate[] {
  return [
    // ── Income (variable freelance) ──────────────────────────────
    { categoryName: 'Freelance', type: TransactionType.INCOME, amount: 800.0, description: 'Freelance web project – client A', day: 5 },
    { categoryName: 'Freelance', type: TransactionType.INCOME, amount: 600.0, description: 'Freelance design gig – Upwork', day: 18 },
    { categoryName: 'Part-time work', type: TransactionType.INCOME, amount: 400.0, description: 'Bar shift – weekend work', day: 28 },
    // ── Needs ───────────────────────────────────────────────────
    { categoryName: 'Housing', type: TransactionType.EXPENSE, amount: 500.0, description: 'Rent – shared room Surquillo', day: 1 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 70.0, description: 'Groceries – La Colmena market', day: 2 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 50.0, description: 'Bus card top-up', day: 3 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 40.0, description: 'Internet – Claro', day: 4 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 55.0, description: 'Groceries – Metro', day: 9 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 35.0, description: 'Pharmacy – medicine', day: 11 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 38.0, description: 'Phone bill – Bitel prepaid', day: 13 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 60.0, description: 'Groceries – Tottus', day: 16 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 30.0, description: 'Taxi – late work night', day: 17 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 52.0, description: 'Groceries – Metro', day: 23 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 60.0, description: 'Medical check-up', day: 25 },
    // ── Wants ───────────────────────────────────────────────────
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 22.9, description: 'Netflix', day: 6 },
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 9.9, description: 'YouTube Premium', day: 6 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 45.0, description: 'Cinema Cineplanet', day: 8 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 40.0, description: 'Rappi delivery – pizza', day: 10 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 80.0, description: 'Clothes – Gamarra wholesale', day: 12 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 35.0, description: 'Video game top-up', day: 14 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 25.0, description: 'Starbucks – coffee', day: 15 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 50.0, description: 'Pub night with coworkers', day: 20 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 65.0, description: 'Headphones – Falabella', day: 22 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 30.0, description: 'PedidosYa – burger', day: 24 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 40.0, description: 'Karaoke night', day: 26 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 45.0, description: 'Gym accessories', day: 27 },
    // ── Savings ─────────────────────────────────────────────────
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 100.0, description: 'Emergency fund – irregular savings', day: 29 },
    // Additional daily food entries to reach 200+ over 6 months
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 18.0, description: 'Lunch – restaurant near work', day: 7 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 22.0, description: 'Breakfast + coffee', day: 19 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 12.0, description: 'Combi fare', day: 21 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 20.0, description: 'Lunch – menú del día', day: 30 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 15.0, description: 'Chicha morada + picarones', day: 31 },
    { categoryName: 'Education', type: TransactionType.EXPENSE, amount: 50.0, description: 'Online course – Udemy', day: 28 },
  ];
}

async function seedDiego(categoryMap: Map<string, string>): Promise<void> {
  const def: DemoUserDef = {
    email: 'diego.ramirez@zenda.demo',
    fullName: 'Diego Ramírez',
    age: 23,
    university: 'Universidad de Lima',
    incomeType: IncomeType.MIXED,
    averageMonthlyIncome: 1800,
    financialLiteracyLevel: FinancialLiteracyLevel.LOW,
  };
  const passwordHash = await hash(DEMO_PASSWORD);
  const userId = await upsertDemoUser(def, passwordHash);

  const months = [
    { year: 2025, month: 11 }, { year: 2025, month: 12 },
    { year: 2026, month: 1 }, { year: 2026, month: 2 },
    { year: 2026, month: 3 }, { year: 2026, month: 4 },
  ];
  await seedTransactions(userId, categoryMap, diegoTransactions, months);
  await seedNotificationPreferences(userId);

  console.log(`✓ Diego Ramírez seeded  (${def.email})`);
}

// ─────────────────────────────────────────────────────────────────
// USER 5 — María Quispe (scholarship + part-time, high saver, 6 months)
// ─────────────────────────────────────────────────────────────────

function mariaTransactions(_year: number, _month: number): TxTemplate[] {
  return [
    // ── Income ──────────────────────────────────────────────────
    { categoryName: 'Scholarship', type: TransactionType.INCOME, amount: 1200.0, description: 'PRONABEC scholarship monthly disbursement', day: 1 },
    { categoryName: 'Part-time work', type: TransactionType.INCOME, amount: 600.0, description: 'Library assistant stipend – PUCP', day: 15 },
    // ── Needs ───────────────────────────────────────────────────
    { categoryName: 'Housing', type: TransactionType.EXPENSE, amount: 380.0, description: 'Rent – student room Breña', day: 2 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 60.0, description: 'Groceries – Mercado Santa Anita', day: 3 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 45.0, description: 'Metropolitano card recharge', day: 4 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 35.0, description: 'Internet – Movistar', day: 5 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 55.0, description: 'Groceries – Metro', day: 8 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 25.0, description: 'Pharmacy – vitamin supplements', day: 10 },
    { categoryName: 'Utilities', type: TransactionType.EXPENSE, amount: 32.0, description: 'Water and electricity split', day: 12 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 50.0, description: 'Groceries – Tottus', day: 15 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 20.0, description: 'Combi fares – week 3', day: 18 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 48.0, description: 'Groceries – La Colmena', day: 22 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 40.0, description: 'Dental check-up', day: 24 },
    { categoryName: 'Education', type: TransactionType.EXPENSE, amount: 80.0, description: 'PUCP textbooks and print materials', day: 6 },
    { categoryName: 'Education', type: TransactionType.EXPENSE, amount: 35.0, description: 'Language lab fee', day: 20 },
    // ── Wants ───────────────────────────────────────────────────
    { categoryName: 'Subscriptions', type: TransactionType.EXPENSE, amount: 12.9, description: 'Spotify', day: 7 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 25.0, description: 'Theatre – student discount', day: 9 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 18.0, description: 'Helados Artika – treat yourself', day: 11 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 55.0, description: 'Office supplies and stationery', day: 13 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 30.0, description: 'Museum entry – student card', day: 17 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 20.0, description: 'Afternoon snacks – campus café', day: 19 },
    { categoryName: 'Shopping', type: TransactionType.EXPENSE, amount: 42.0, description: 'Clothes – secondhand Gamarra', day: 21 },
    { categoryName: 'Entertainment', type: TransactionType.EXPENSE, amount: 28.0, description: 'Movie night at home – rental', day: 23 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 15.0, description: 'Jugos naturales – lunch treat', day: 25 },
    // ── Savings (disciplined – saves 30%+) ───────────────────────
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 400.0, description: 'Savings transfer – emergency fund', day: 1 },
    { categoryName: 'Savings', type: TransactionType.EXPENSE, amount: 100.0, description: 'Goal contribution – study abroad', day: 28 },
    // Additional small transactions for richness
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 14.0, description: 'Lunch menú – near campus', day: 14 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 16.0, description: 'Empanadas + chicha – breakfast', day: 16 },
    { categoryName: 'Transportation', type: TransactionType.EXPENSE, amount: 8.0, description: 'Bus fare – evening return', day: 26 },
    { categoryName: 'Food', type: TransactionType.EXPENSE, amount: 22.0, description: 'Sunday market – fruits and vegetables', day: 27 },
    { categoryName: 'Health', type: TransactionType.EXPENSE, amount: 18.0, description: 'Nasal spray – allergy season', day: 29 },
    { categoryName: 'Education', type: TransactionType.EXPENSE, amount: 25.0, description: 'Online library access fee', day: 30 },
    { categoryName: 'Cravings', type: TransactionType.EXPENSE, amount: 12.0, description: 'Chocolate + nuts – study fuel', day: 31 },
  ];
}

async function seedMaria(categoryMap: Map<string, string>): Promise<void> {
  const def: DemoUserDef = {
    email: 'maria.quispe@zenda.demo',
    fullName: 'María Quispe',
    age: 21,
    university: 'Pontificia Universidad Católica del Perú',
    incomeType: IncomeType.SCHOLARSHIP,
    averageMonthlyIncome: 1800,
    financialLiteracyLevel: FinancialLiteracyLevel.HIGH,
  };
  const passwordHash = await hash(DEMO_PASSWORD);
  const userId = await upsertDemoUser(def, passwordHash);

  const months = [
    { year: 2025, month: 11 }, { year: 2025, month: 12 },
    { year: 2026, month: 1 }, { year: 2026, month: 2 },
    { year: 2026, month: 3 }, { year: 2026, month: 4 },
  ];
  await seedTransactions(userId, categoryMap, mariaTransactions, months);
  await seedNotificationPreferences(userId);

  console.log(`✓ María Quispe seeded  (${def.email})`);
}

async function main(): Promise<void> {
  console.log('\n── Zenda Demo Seed ─────────────────────────────────────');
  console.log('Ensuring system categories exist...');
  await ensureSystemCategories();

  const categoryMap = await getCategoryMap();
  console.log(`  Found ${categoryMap.size} system categories.\n`);

  console.log('Seeding Ana García...');
  await seedAna(categoryMap);

  console.log('Seeding Carlos Mendoza...');
  await seedCarlos(categoryMap);

  console.log('Seeding Lucía Torres...');
  await seedLucia(categoryMap);

  console.log('Seeding Diego Ramírez...');
  await seedDiego(categoryMap);

  console.log('Seeding María Quispe...');
  await seedMaria(categoryMap);

  console.log('\n── Demo seed complete ──────────────────────────────────');
  console.log('Demo credentials (all share password: Demo1234!)');
  console.log('  ana.garcia@zenda.demo     — balanced spender, MEDIUM literacy');
  console.log('  carlos.mendoza@zenda.demo — overspender on wants, LOW literacy');
  console.log('  lucia.torres@zenda.demo   — disciplined saver, HIGH literacy');
  console.log('  diego.ramirez@zenda.demo  — gig worker, irregular income, LOW literacy');
  console.log('  maria.quispe@zenda.demo   — scholarship + part-time, HIGH literacy');
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
