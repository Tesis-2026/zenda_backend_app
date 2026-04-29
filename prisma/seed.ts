import * as bcrypt from 'bcrypt';
import {
  CategoryType,
  PrismaClient,
  TransactionType,
  TopicDifficulty,
  SurveyType,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  // Core 50/30/20 needs
  'Food',
  'Transportation',
  'Housing',
  'Utilities',
  'Health',
  // Wants (mapped from Flutter TransactionCategory enum)
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Cravings',
  // Savings bucket
  'Savings',
  // Misc
  'Education',
  'Other',
];

const INCOME_CATEGORIES = [
  'Scholarship',
  'Part-time work',
  'Family',
  'Freelance',
  'Other',
];

// ─────────────────────────────────────────────────────────────────
// CHALLENGES (US-1002)
// ─────────────────────────────────────────────────────────────────

const CHALLENGES = [
  {
    title: 'No delivery spending for 3 days',
    description:
      'Avoid any delivery or takeout spending for 3 consecutive days.',
    criteriaJson: {
      type: 'no_transactions_category',
      categoryName: 'Food',
      durationDays: 3,
    },
    reward: 'Saving discipline badge',
  },
  {
    title: 'Record expenses for 7 consecutive days',
    description:
      'Record at least one expense transaction every day for 7 days in a row.',
    criteriaJson: {
      type: 'daily_recording_streak',
      durationDays: 7,
    },
    reward: 'Consistency badge',
  },
  {
    title: 'Save S/20 this week',
    description:
      'Contribute at least S/20 to any savings goal within the current week.',
    criteriaJson: {
      type: 'savings_goal_contribution',
      minimumAmount: 20,
      periodDays: 7,
    },
    reward: 'Saver badge',
  },
  {
    title: 'Reduce entertainment spending by 10%',
    description:
      'Spend 10% less on entertainment this month compared to last month.',
    criteriaJson: {
      type: 'category_reduction_percentage',
      categoryName: 'Entertainment',
      reductionPercent: 10,
    },
    reward: 'Smart spender badge',
  },
];

// ─────────────────────────────────────────────────────────────────
// BADGES (US-1003)
// ─────────────────────────────────────────────────────────────────

const BADGES = [
  {
    name: 'First Transaction',
    description: 'Recorded your first transaction.',
    criteria: 'Record your first income or expense transaction.',
  },
  {
    name: 'Consistency',
    description: 'Recorded transactions for 7 consecutive days.',
    criteria: 'Record at least one transaction per day for 7 days in a row.',
  },
  {
    name: 'Goal Achieved',
    description: 'Completed your first savings goal.',
    criteria: 'Reach 100% of the target amount on any savings goal.',
  },
  {
    name: 'Challenger',
    description: 'Completed 5 financial challenges.',
    criteria: 'Complete any 5 challenges.',
  },
  {
    name: 'Financial Sage',
    description: 'Completed all educational modules.',
    criteria: 'Mark all educational topics as completed.',
  },
  {
    name: 'Predictor',
    description: 'Checked your spending predictions 3 times.',
    criteria: 'View the predictions screen at least 3 times.',
  },
  {
    name: 'Budgeter',
    description: 'Created and respected a budget for a full month.',
    criteria:
      'Create a budget and finish the month without exceeding it.',
  },
];

// ─────────────────────────────────────────────────────────────────
// EDUCATIONAL TOPICS (US-1001)
// ─────────────────────────────────────────────────────────────────

const EDUCATIONAL_TOPICS = [
  {
    title: 'Personal Budget',
    content:
      'A personal budget is a plan that helps you control your income and expenses. The 50/30/20 rule divides your income into: 50% for needs (housing, food, transportation), 30% for wants (entertainment, dining out), and 20% for savings and debt payments. Start by recording all your income sources and fixed expenses, then identify areas where you can cut back.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 1,
  },
  {
    title: 'Savings Habits',
    content:
      'Saving money consistently, even in small amounts, builds a financial safety net. The "pay yourself first" strategy means setting aside savings as soon as you receive income — before spending on anything else. Even saving S/10 a week adds up to S/520 per year. Digital piggy banks like savings goals in apps help make progress visible and motivating.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 2,
  },
  {
    title: 'Credit and Debt',
    content:
      'Credit allows you to access money you do not yet have, but it comes with a cost: interest. Credit cards in Peru typically charge 40–80% annual interest (TEA). Before using credit, ask: can I pay this back within one billing cycle? Good debt (education, productive investment) differs from bad debt (consumption on impulse). Always read the fine print on any financial product.',
    difficulty: TopicDifficulty.INTERMEDIATE,
    order: 3,
  },
  {
    title: 'Inflation',
    content:
      "Inflation is the gradual increase in the price of goods and services over time. Peru's BCRP targets 2% annual inflation. In practice, this means S/100 today buys less than S/100 did last year. For students, inflation affects the real value of your savings: money left idle loses purchasing power. Understanding inflation helps you make better decisions about saving vs. spending.",
    difficulty: TopicDifficulty.INTERMEDIATE,
    order: 4,
  },
  {
    title: 'Interest Rates',
    content:
      'An interest rate is the cost of borrowing money or the reward for saving it. TNA (nominal annual rate) and TEA (effective annual rate) measure this differently — TEA accounts for compounding and is the true cost. When comparing loans or savings accounts, always compare TEA. A savings account offering 5% TEA doubles your money in approximately 14 years (Rule of 72).',
    difficulty: TopicDifficulty.INTERMEDIATE,
    order: 5,
  },
  {
    title: 'Basic Investing',
    content:
      'Investing means putting money to work so it grows over time. Common options in Peru: (1) Savings accounts — low risk, low return (~3% TEA). (2) Fondos Mutuos — pooled investment funds, moderate risk. (3) Acciones (stocks) — higher risk, higher potential return. For beginners, the key principle is diversification: do not put all your money in one place. Start small and learn by doing.',
    difficulty: TopicDifficulty.ADVANCED,
    order: 6,
  },
  {
    title: 'Responsible Consumption',
    content:
      'Responsible consumption means buying only what you truly need and evaluating purchases before making them. The 24-hour rule: wait 24 hours before any non-essential purchase over S/50. Distinguish between needs (things necessary for health and function) and wants (things desirable but not essential). Tracking every expense makes impulse buying visible and helps you break the habit.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 7,
  },
  {
    title: 'Digital Wallets in Peru',
    content:
      "Peru's main digital wallets are Yape (BCP), Plin (BBVA/Interbank/Scotiabank), and Tunki (Interbank). These apps allow instant peer-to-peer transfers without fees. They are useful for splitting bills, paying small businesses, and receiving income. However, they are payments tools, not savings tools — the money sits in your bank account, not invested. Always enable two-factor authentication on any financial app.",
    difficulty: TopicDifficulty.BEGINNER,
    order: 8,
  },
];

// ─────────────────────────────────────────────────────────────────
// SURVEYS — financial literacy knowledge questions (US-1201/1202)
// ─────────────────────────────────────────────────────────────────

const SURVEYS = [
  { type: SurveyType.PRE },
  { type: SurveyType.POST },
  { type: SurveyType.SUS },
];

const SURVEY_QUESTIONS: Array<{
  surveyType: SurveyType;
  order: number;
  text: string;
  options: string[];
  correctAnswer: string;
}> = [
  // PRE-survey questions
  {
    surveyType: SurveyType.PRE,
    order: 1,
    text: 'What does the 50/30/20 budget rule mean?',
    options: [
      '50% needs, 30% wants, 20% savings',
      '50% savings, 30% needs, 20% wants',
      '50% wants, 30% savings, 20% needs',
      'It refers to tax brackets in Peru',
    ],
    correctAnswer: '50% needs, 30% wants, 20% savings',
  },
  {
    surveyType: SurveyType.PRE,
    order: 2,
    text: 'What is TEA (Tasa Efectiva Anual)?',
    options: [
      'The nominal annual interest rate without compounding',
      'The effective annual rate that accounts for compounding',
      'A government tax on bank accounts',
      'A metric for inflation in Peru',
    ],
    correctAnswer: 'The effective annual rate that accounts for compounding',
  },
  {
    surveyType: SurveyType.PRE,
    order: 3,
    text: 'Which of the following is considered a "need" in the 50/30/20 rule?',
    options: ['Netflix subscription', 'Rent or housing payment', 'Dining out with friends', 'New sneakers'],
    correctAnswer: 'Rent or housing payment',
  },
  {
    surveyType: SurveyType.PRE,
    order: 4,
    text: 'What does "pay yourself first" mean?',
    options: [
      'Spend on luxuries before paying bills',
      'Save a portion of your income before spending on anything else',
      'Pay your debts before saving',
      'Give yourself a weekly allowance',
    ],
    correctAnswer: 'Save a portion of your income before spending on anything else',
  },
  {
    surveyType: SurveyType.PRE,
    order: 5,
    text: 'If you save S/10 per week, approximately how much will you have saved after one year?',
    options: ['S/240', 'S/520', 'S/1,200', 'S/50'],
    correctAnswer: 'S/520',
  },
  {
    surveyType: SurveyType.PRE,
    order: 6,
    text: 'What is the "Rule of 72" used for?',
    options: [
      'Calculating monthly loan payments',
      'Estimating how many years it takes to double an investment',
      'Determining the optimal credit card limit',
      'Computing inflation-adjusted savings',
    ],
    correctAnswer: 'Estimating how many years it takes to double an investment',
  },
  {
    surveyType: SurveyType.PRE,
    order: 7,
    text: 'Which digital wallet is associated with Banco de Crédito del Perú (BCP)?',
    options: ['Plin', 'Yape', 'Tunki', 'Lukita'],
    correctAnswer: 'Yape',
  },
  {
    surveyType: SurveyType.PRE,
    order: 8,
    text: 'What is inflation?',
    options: [
      'A decrease in the purchasing power of money over time',
      'An increase in personal savings rates',
      'The interest rate on government bonds',
      'A tax on imported goods',
    ],
    correctAnswer: 'A decrease in the purchasing power of money over time',
  },
  // POST-survey questions (same questions, tests improvement)
  {
    surveyType: SurveyType.POST,
    order: 1,
    text: 'What does the 50/30/20 budget rule mean?',
    options: [
      '50% needs, 30% wants, 20% savings',
      '50% savings, 30% needs, 20% wants',
      '50% wants, 30% savings, 20% needs',
      'It refers to tax brackets in Peru',
    ],
    correctAnswer: '50% needs, 30% wants, 20% savings',
  },
  {
    surveyType: SurveyType.POST,
    order: 2,
    text: 'What is TEA (Tasa Efectiva Anual)?',
    options: [
      'The nominal annual interest rate without compounding',
      'The effective annual rate that accounts for compounding',
      'A government tax on bank accounts',
      'A metric for inflation in Peru',
    ],
    correctAnswer: 'The effective annual rate that accounts for compounding',
  },
  {
    surveyType: SurveyType.POST,
    order: 3,
    text: 'Which of the following is considered a "need" in the 50/30/20 rule?',
    options: ['Netflix subscription', 'Rent or housing payment', 'Dining out with friends', 'New sneakers'],
    correctAnswer: 'Rent or housing payment',
  },
  {
    surveyType: SurveyType.POST,
    order: 4,
    text: 'What does "pay yourself first" mean?',
    options: [
      'Spend on luxuries before paying bills',
      'Save a portion of your income before spending on anything else',
      'Pay your debts before saving',
      'Give yourself a weekly allowance',
    ],
    correctAnswer: 'Save a portion of your income before spending on anything else',
  },
  {
    surveyType: SurveyType.POST,
    order: 5,
    text: 'If you save S/10 per week, approximately how much will you have saved after one year?',
    options: ['S/240', 'S/520', 'S/1,200', 'S/50'],
    correctAnswer: 'S/520',
  },
  {
    surveyType: SurveyType.POST,
    order: 6,
    text: 'What is the "Rule of 72" used for?',
    options: [
      'Calculating monthly loan payments',
      'Estimating how many years it takes to double an investment',
      'Determining the optimal credit card limit',
      'Computing inflation-adjusted savings',
    ],
    correctAnswer: 'Estimating how many years it takes to double an investment',
  },
  {
    surveyType: SurveyType.POST,
    order: 7,
    text: 'Which digital wallet is associated with Banco de Crédito del Perú (BCP)?',
    options: ['Plin', 'Yape', 'Tunki', 'Lukita'],
    correctAnswer: 'Yape',
  },
  {
    surveyType: SurveyType.POST,
    order: 8,
    text: 'What is inflation?',
    options: [
      'A decrease in the purchasing power of money over time',
      'An increase in personal savings rates',
      'The interest rate on government bonds',
      'A tax on imported goods',
    ],
    correctAnswer: 'A decrease in the purchasing power of money over time',
  },
];

// ─────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────

async function seedCategories(): Promise<void> {
  for (const name of EXPENSE_CATEGORIES) {
    const exists = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: CategoryType.SYSTEM, deletedAt: null },
      select: { id: true },
    });
    if (!exists) {
      await prisma.category.create({
        data: { name, type: CategoryType.SYSTEM, transactionType: TransactionType.EXPENSE },
      });
    }
  }

  for (const name of INCOME_CATEGORIES) {
    const exists = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: CategoryType.SYSTEM, deletedAt: null },
      select: { id: true },
    });
    if (!exists) {
      await prisma.category.create({
        data: { name, type: CategoryType.SYSTEM, transactionType: TransactionType.INCOME },
      });
    }
  }
  console.log('✓ Categories seeded');
}

async function seedChallenges(): Promise<void> {
  for (const challenge of CHALLENGES) {
    const exists = await prisma.challenge.findFirst({
      where: { title: challenge.title },
      select: { id: true },
    });
    if (!exists) {
      await prisma.challenge.create({ data: challenge });
    }
  }
  console.log('✓ Challenges seeded');
}

async function seedBadges(): Promise<void> {
  for (const badge of BADGES) {
    const exists = await prisma.badge.findFirst({
      where: { name: badge.name },
      select: { id: true },
    });
    if (!exists) {
      await prisma.badge.create({ data: badge });
    }
  }
  console.log('✓ Badges seeded');
}

async function seedEducationalTopics(): Promise<void> {
  for (const topic of EDUCATIONAL_TOPICS) {
    const exists = await prisma.educationalTopic.findFirst({
      where: { title: topic.title },
      select: { id: true },
    });
    if (!exists) {
      await prisma.educationalTopic.create({ data: topic });
    }
  }
  console.log('✓ Educational topics seeded');
}

async function seedSurveys(): Promise<void> {
  for (const survey of SURVEYS) {
    let record = await prisma.survey.findFirst({ where: { type: survey.type } });
    if (!record) {
      record = await prisma.survey.create({ data: survey });
    }
    const questions = SURVEY_QUESTIONS.filter((q) => q.surveyType === survey.type);
    for (const q of questions) {
      const existingQ = await prisma.surveyQuestion.findFirst({
        where: { surveyId: record.id, order: q.order },
        select: { id: true },
      });
      if (!existingQ) {
        await prisma.surveyQuestion.create({
          data: {
            surveyId: record.id,
            order: q.order,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
          },
        });
      } else {
        await prisma.surveyQuestion.update({
          where: { id: existingQ.id },
          data: { correctAnswer: q.correctAnswer },
        });
      }
    }
  }
  console.log('✓ Surveys and questions seeded');
}

async function seedDemoUser(): Promise<void> {
  const DEMO_EMAIL = 'demo@zenda.app';
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log('✓ Demo user already exists — skipping demo data seed');
    return;
  }

  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      fullName: 'Demo Student',
      passwordHash,
      age: 21,
      university: 'UPC',
      profileCompleted: true,
    },
  });

  // Fetch system categories
  const categories = await prisma.category.findMany({
    where: { type: CategoryType.SYSTEM, deletedAt: null },
  });
  const catByName = new Map(categories.map((c) => [c.name, c.id]));

  // ── 200 realistic transactions over the last 6 months ─────────────
  const expenseEntries: Array<{ name: string; minAmount: number; maxAmount: number }> = [
    { name: 'Food', minAmount: 8, maxAmount: 35 },
    { name: 'Transportation', minAmount: 3, maxAmount: 25 },
    { name: 'Entertainment', minAmount: 15, maxAmount: 60 },
    { name: 'Shopping', minAmount: 20, maxAmount: 150 },
    { name: 'Health', minAmount: 15, maxAmount: 80 },
    { name: 'Subscriptions', minAmount: 20, maxAmount: 45 },
    { name: 'Cravings', minAmount: 5, maxAmount: 20 },
    { name: 'Housing', minAmount: 350, maxAmount: 600 },
    { name: 'Utilities', minAmount: 30, maxAmount: 100 },
    { name: 'Other', minAmount: 10, maxAmount: 50 },
  ];

  const incomeEntries: Array<{ name: string; minAmount: number; maxAmount: number }> = [
    { name: 'Scholarship', minAmount: 400, maxAmount: 600 },
    { name: 'Part-time work', minAmount: 300, maxAmount: 700 },
    { name: 'Family', minAmount: 200, maxAmount: 400 },
  ];

  const rand = (min: number, max: number): number =>
    Math.round((min + Math.random() * (max - min)) * 100) / 100;

  const now = new Date();
  const txData: Array<{
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description: string;
    occurredAt: Date;
  }> = [];

  // 180 expense transactions spread over 180 days
  for (let i = 0; i < 180; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const entry = expenseEntries[Math.floor(Math.random() * expenseEntries.length)];
    const catId = catByName.get(entry.name);
    if (!catId) continue;
    txData.push({
      userId: user.id,
      categoryId: catId,
      type: TransactionType.EXPENSE,
      amount: rand(entry.minAmount, entry.maxAmount),
      currency: 'PEN',
      description: `${entry.name} expense`,
      occurredAt: date,
    });
  }

  // 30 income transactions (roughly 5 per month)
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const entry = incomeEntries[Math.floor(Math.random() * incomeEntries.length)];
    const catId = catByName.get(entry.name);
    if (!catId) continue;
    txData.push({
      userId: user.id,
      categoryId: catId,
      type: TransactionType.INCOME,
      amount: rand(entry.minAmount, entry.maxAmount),
      currency: 'PEN',
      description: `${entry.name} income`,
      occurredAt: date,
    });
  }

  await prisma.transaction.createMany({ data: txData });

  // ── 2 savings goals (one completed) ────────────────────────────
  const completedGoal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: 500,
      currentAmount: 500,
    },
  });
  await prisma.goalContribution.createMany({
    data: [
      { goalId: completedGoal.id, amount: 200, createdAt: new Date(now.getTime() - 60 * 86400000) },
      { goalId: completedGoal.id, amount: 150, createdAt: new Date(now.getTime() - 30 * 86400000) },
      { goalId: completedGoal.id, amount: 150, createdAt: new Date(now.getTime() - 7 * 86400000) },
    ],
  });

  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: 'New Laptop',
      targetAmount: 2500,
      currentAmount: 800,
    },
  });

  // ── 2 budgets ───────────────────────────────────────────────────
  const foodCatId = catByName.get('Food');
  const entCatId = catByName.get('Entertainment');
  if (foodCatId) {
    await prisma.budget.create({
      data: { userId: user.id, categoryId: foodCatId, amountLimit: 300, month: now.getMonth() + 1, year: now.getFullYear() },
    }).catch(() => undefined);
  }
  if (entCatId) {
    await prisma.budget.create({
      data: { userId: user.id, categoryId: entCatId, amountLimit: 150, month: now.getMonth() + 1, year: now.getFullYear() },
    }).catch(() => undefined);
  }

  console.log(`✓ Demo user seeded: email=${DEMO_EMAIL}, password=Demo1234!, ${txData.length} transactions`);
}

async function main(): Promise<void> {
  console.log('Seeding database...');
  await seedCategories();
  await seedChallenges();
  await seedBadges();
  await seedEducationalTopics();
  await seedSurveys();
  await seedDemoUser();
  console.log('Seed complete.');
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
