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
  'Food',
  'Transportation',
  'Education',
  'Entertainment',
  'Health',
  'Housing',
  'Utilities',
  'Clothing',
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
// SURVEYS — placeholder records (questions added in Phase 12)
// ─────────────────────────────────────────────────────────────────

const SURVEYS = [
  { type: SurveyType.PRE },
  { type: SurveyType.POST },
  { type: SurveyType.SUS },
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
    const exists = await prisma.survey.findFirst({
      where: { type: survey.type },
      select: { id: true },
    });
    if (!exists) {
      await prisma.survey.create({ data: survey });
    }
  }
  console.log('✓ Survey records seeded (questions added in Phase 12)');
}

async function main(): Promise<void> {
  console.log('Seeding database...');
  await seedCategories();
  await seedChallenges();
  await seedBadges();
  await seedEducationalTopics();
  await seedSurveys();
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
