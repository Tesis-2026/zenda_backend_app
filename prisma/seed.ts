import * as bcrypt from 'bcrypt';
import {
  CategoryType,
  FinancialLiteracyLevel,
  IncomeType,
  PrismaClient,
  RecommendationType,
  SurveyType,
  TopicDifficulty,
  TransactionType,
  UserChallengeStatus,
} from '@prisma/client';

type QuizDifficulty = TopicDifficulty;

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
  // PRE questions 9–15
  {
    surveyType: SurveyType.PRE,
    order: 9,
    text: 'How many months of expenses should an emergency fund ideally cover?',
    options: ['1 month', '2 months', '3 to 6 months', '12 months'],
    correctAnswer: '3 to 6 months',
  },
  {
    surveyType: SurveyType.PRE,
    order: 10,
    text: 'If you do not pay your full credit card balance, interest is charged on:',
    options: [
      'Only the new purchases made that month',
      'The unpaid balance, compounding each billing cycle',
      'Only the minimum payment amount',
      'Nothing — credit cards are interest-free if you pay the minimum',
    ],
    correctAnswer: 'The unpaid balance, compounding each billing cycle',
  },
  {
    surveyType: SurveyType.PRE,
    order: 11,
    text: 'If inflation is 6% and your savings account earns 3%, what happens to the real value of your savings?',
    options: [
      'It grows at 9%',
      'It stays the same',
      'It decreases — your purchasing power falls by approximately 3% per year',
      'It depends on the bank',
    ],
    correctAnswer: 'It decreases — your purchasing power falls by approximately 3% per year',
  },
  {
    surveyType: SurveyType.PRE,
    order: 12,
    text: 'What is "opportunity cost"?',
    options: [
      'The discount you receive when buying in bulk',
      'The value of the next-best alternative you give up when making a choice',
      'The extra cost of buying on credit instead of cash',
      'A government subsidy for low-income students',
    ],
    correctAnswer: 'The value of the next-best alternative you give up when making a choice',
  },
  {
    surveyType: SurveyType.PRE,
    order: 13,
    text: 'What is the main difference between a debit card and a credit card?',
    options: [
      'Debit cards charge interest; credit cards do not',
      'Debit cards spend your own money; credit cards borrow money you must repay',
      'Credit cards can only be used online; debit cards only in stores',
      'There is no difference — both draw from your bank account',
    ],
    correctAnswer: 'Debit cards spend your own money; credit cards borrow money you must repay',
  },
  {
    surveyType: SurveyType.PRE,
    order: 14,
    text: 'In Peru\'s AFP pension system, which fund type is recommended for young workers (under 30)?',
    options: ['Fondo 0 (capital preservation)', 'Fondo 1 (conservative bonds)', 'Fondo 2 (balanced)', 'Fondo 3 (aggressive growth)'],
    correctAnswer: 'Fondo 3 (aggressive growth)',
  },
  {
    surveyType: SurveyType.PRE,
    order: 15,
    text: 'What is dollar cost averaging (DCA)?',
    options: [
      'Exchanging soles to dollars to protect against inflation',
      'Investing a fixed amount regularly regardless of market price to reduce timing risk',
      'Buying assets only when prices are at their lowest',
      'A strategy used only by professional investors',
    ],
    correctAnswer: 'Investing a fixed amount regularly regardless of market price to reduce timing risk',
  },
  // POST questions 9–15 (same concepts, different phrasing)
  {
    surveyType: SurveyType.POST,
    order: 9,
    text: 'Financial experts recommend saving at least how many months of living expenses as an emergency fund?',
    options: ['1 month', '2 months', '3 to 6 months', '18 months'],
    correctAnswer: '3 to 6 months',
  },
  {
    surveyType: SurveyType.POST,
    order: 10,
    text: 'A Scotiabank credit card has a 60% TEA. You carry a S/500 balance for one year without paying. Approximately how much will you owe?',
    options: ['S/530', 'S/600', 'S/800', 'S/1,050'],
    correctAnswer: 'S/800',
  },
  {
    surveyType: SurveyType.POST,
    order: 11,
    text: 'Peru\'s BCRP targets annual inflation at approximately 2%. If your salary stays the same but prices rise 2%, your real purchasing power:',
    options: [
      'Increases by 2%',
      'Stays exactly the same',
      'Decreases by approximately 2%',
      'Depends entirely on the dollar exchange rate',
    ],
    correctAnswer: 'Decreases by approximately 2%',
  },
  {
    surveyType: SurveyType.POST,
    order: 12,
    text: 'You spend S/300 on a new phone instead of contributing to your emergency fund. The S/300 of savings you forgo is called:',
    options: [
      'A sunk cost',
      'The opportunity cost of buying the phone',
      'A fixed cost',
      'A discretionary expense',
    ],
    correctAnswer: 'The opportunity cost of buying the phone',
  },
  {
    surveyType: SurveyType.POST,
    order: 13,
    text: 'You pay for groceries with your Interbank debit card. The money comes from:',
    options: [
      'A line of credit you repay next month',
      'Your own bank account balance immediately',
      'A loan from Interbank at the prevailing TEA',
      'A government subsidy for essential purchases',
    ],
    correctAnswer: 'Your own bank account balance immediately',
  },
  {
    surveyType: SurveyType.POST,
    order: 14,
    text: 'Between 2020 and 2022, Congress allowed Peruvians to withdraw AFP funds. What long-term risk does this create for young workers who withdrew?',
    options: [
      'No risk — the AFP refills balances automatically',
      'Loss of decades of compound growth in their retirement fund',
      'The withdrawn amount counts as taxable income at 29.5%',
      'They lose access to future AFP Fondo 3',
    ],
    correctAnswer: 'Loss of decades of compound growth in their retirement fund',
  },
  {
    surveyType: SurveyType.POST,
    order: 15,
    text: 'A university student invests S/100 every month in a fondo mutuo regardless of whether the market is up or down. This strategy is called:',
    options: [
      'Market timing',
      'Dollar cost averaging',
      'Hedging',
      'Arbitrage',
    ],
    correctAnswer: 'Dollar cost averaging',
  },
  // SUS survey — 10 standard Likert-scale questions (no correctAnswer; scored by formula)
  { surveyType: SurveyType.SUS, order: 1,  text: 'Creo que me gustaría usar esta aplicación con frecuencia.',                                                    options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 2,  text: 'Encontré la aplicación innecesariamente compleja.',                                                            options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 3,  text: 'Pensé que la aplicación era fácil de usar.',                                                                   options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 4,  text: 'Creo que necesitaría el apoyo de una persona técnica para poder usar esta aplicación.',                         options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 5,  text: 'Encontré que las distintas funciones de la aplicación estaban bien integradas.',                               options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 6,  text: 'Pensé que había demasiada inconsistencia en esta aplicación.',                                                 options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 7,  text: 'Imagino que la mayoría de personas aprendería a usar esta aplicación muy rápidamente.',                        options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 8,  text: 'Encontré la aplicación muy difícil de usar.',                                                                  options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 9,  text: 'Me sentí muy seguro/a usando la aplicación.',                                                                  options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
  { surveyType: SurveyType.SUS, order: 10, text: 'Necesité aprender muchas cosas antes de poder comenzar a usar esta aplicación.',                               options: ['1','2','3','4','5'], correctAnswer: null as unknown as string },
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

// ─────────────────────────────────────────────────────────────────
// PILOT USERS — 5 distinct profiles for thesis testing
// All passwords: Demo1234!
// ─────────────────────────────────────────────────────────────────

async function seedPilotUsers(): Promise<void> {
  // ── Shared reference data ────────────────────────────────────────
  const categories = await prisma.category.findMany({ where: { type: CategoryType.SYSTEM, deletedAt: null } });
  const catByName = new Map(categories.map((c) => [c.name, c.id]));

  const allChallenges = await prisma.challenge.findMany();
  const challengeByTitle = new Map(allChallenges.map((c) => [c.title, c.id]));

  const allBadges = await prisma.badge.findMany();
  const badgeByName = new Map(allBadges.map((b) => [b.name, b.id]));

  const allTopics = await prisma.educationalTopic.findMany({ orderBy: { order: 'asc' } });
  const topicByTitle = new Map(allTopics.map((t) => [t.title, t.id]));
  const allTopicIds = allTopics.map((t) => t.id);

  const preSurvey = await prisma.survey.findFirst({ where: { type: SurveyType.PRE } });
  const postSurvey = await prisma.survey.findFirst({ where: { type: SurveyType.POST } });

  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const rand = (min: number, max: number): number =>
    Math.round((min + Math.random() * (max - min)) * 100) / 100;
  const daysBack = (n: number): Date => new Date(now.getTime() - n * 86400000);

  type TxRow = {
    userId: string; categoryId: string; type: TransactionType;
    amount: number; currency: string; description: string; occurredAt: Date;
  };

  // ─── Helper: build random transactions for a user ───────────────
  function buildTransactions(
    userId: string,
    expenseRules: Array<{ name: string; min: number; max: number; weight?: number }>,
    incomeRules: Array<{ name: string; min: number; max: number }>,
    windowDays: number,
    expenseCount: number,
    incomeCount: number,
    // optional bias: force extra current-month expenses for specific categories
    currentMonthBias?: Array<{ name: string; min: number; max: number; count: number }>,
  ): TxRow[] {
    const rows: TxRow[] = [];

    for (let i = 0; i < expenseCount; i++) {
      const totalWeight = expenseRules.reduce((s, r) => s + (r.weight ?? 1), 0);
      let pick = Math.random() * totalWeight;
      const entry = expenseRules.find((r) => { pick -= (r.weight ?? 1); return pick <= 0; }) ?? expenseRules[0];
      const catId = catByName.get(entry.name);
      if (!catId) continue;
      rows.push({
        userId, categoryId: catId, type: TransactionType.EXPENSE,
        amount: rand(entry.min, entry.max), currency: 'PEN',
        description: `${entry.name} expense`,
        occurredAt: daysBack(Math.floor(Math.random() * windowDays)),
      });
    }

    if (currentMonthBias) {
      for (const bias of currentMonthBias) {
        const catId = catByName.get(bias.name);
        if (!catId) continue;
        for (let i = 0; i < bias.count; i++) {
          rows.push({
            userId, categoryId: catId, type: TransactionType.EXPENSE,
            amount: rand(bias.min, bias.max), currency: 'PEN',
            description: `${bias.name} expense`,
            occurredAt: daysBack(Math.floor(Math.random() * (now.getDate() - 1))),
          });
        }
      }
    }

    for (let i = 0; i < incomeCount; i++) {
      const entry = incomeRules[Math.floor(Math.random() * incomeRules.length)];
      const catId = catByName.get(entry.name);
      if (!catId) continue;
      rows.push({
        userId, categoryId: catId, type: TransactionType.INCOME,
        amount: rand(entry.min, entry.max), currency: 'PEN',
        description: `${entry.name}`,
        occurredAt: daysBack(Math.floor(Math.random() * windowDays)),
      });
    }

    return rows;
  }

  // ─── Helper: award challenges idempotently ───────────────────────
  async function awardChallenges(
    userId: string,
    entries: Array<{ title: string; status: UserChallengeStatus; completedAt?: Date }>,
  ): Promise<void> {
    for (const e of entries) {
      const challengeId = challengeByTitle.get(e.title);
      if (!challengeId) continue;
      await prisma.userChallenge.upsert({
        where: { userId_challengeId: { userId, challengeId } },
        create: { userId, challengeId, status: e.status, acceptedAt: daysBack(10), completedAt: e.completedAt },
        update: {},
      });
    }
  }

  // ─── Helper: award badges idempotently ──────────────────────────
  async function awardBadges(userId: string, names: string[]): Promise<void> {
    for (const name of names) {
      const badgeId = badgeByName.get(name);
      if (!badgeId) continue;
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId } },
        create: { userId, badgeId, earnedAt: daysBack(Math.floor(Math.random() * 30)) },
        update: {},
      });
    }
  }

  // ─── Helper: mark education topics completed ─────────────────────
  async function completeTopics(userId: string, titles: string[]): Promise<void> {
    for (const title of titles) {
      const topicId = topicByTitle.get(title);
      if (!topicId) continue;
      await prisma.userTopicProgress.upsert({
        where: { userId_topicId: { userId, topicId } },
        create: { userId, topicId, completedAt: daysBack(Math.floor(Math.random() * 20) + 5) },
        update: {},
      });
    }
  }

  // ─── Helper: create survey response idempotently ─────────────────
  async function createSurveyResponse(userId: string, surveyId: string, score: number): Promise<void> {
    const exists = await prisma.surveyResponse.findUnique({
      where: { userId_surveyId: { userId, surveyId } },
    });
    if (exists) return;
    await prisma.surveyResponse.create({
      data: { userId, surveyId, answersJson: { seeded: true }, score },
    });
  }

  // ─── Helper: create recommendations ─────────────────────────────
  async function createRecommendations(
    userId: string,
    recs: Array<{ type: RecommendationType; message: string; suggestedAction: string }>,
  ): Promise<void> {
    const existing = await prisma.recommendation.count({ where: { userId } });
    if (existing > 0) return;
    for (const r of recs) {
      await prisma.recommendation.create({
        data: { userId, type: r.type, message: r.message, suggestedAction: r.suggestedAction, isActive: true },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // USER 1 — demo@zenda.app (Demo Student · balanced, mid-literacy)
  // ═══════════════════════════════════════════════════════════════
  {
    let user = await prisma.user.findUnique({ where: { email: 'demo@zenda.app' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@zenda.app', fullName: 'Demo Student', passwordHash,
          age: 21, university: 'UPC', incomeType: IncomeType.PART_TIME,
          averageMonthlyIncome: 650, financialLiteracyLevel: FinancialLiteracyLevel.MEDIUM,
          profileCompleted: true, consentGiven: true, consentAt: daysBack(60),
        },
      });
      const txs = buildTransactions(
        user.id,
        [
          { name: 'Food', min: 8, max: 35, weight: 4 },
          { name: 'Transportation', min: 3, max: 25, weight: 3 },
          { name: 'Entertainment', min: 15, max: 55, weight: 2 },
          { name: 'Shopping', min: 20, max: 120, weight: 2 },
          { name: 'Health', min: 15, max: 70, weight: 1 },
          { name: 'Subscriptions', min: 20, max: 45, weight: 1 },
          { name: 'Cravings', min: 5, max: 20, weight: 2 },
          { name: 'Housing', min: 350, max: 550, weight: 1 },
          { name: 'Utilities', min: 30, max: 90, weight: 1 },
        ],
        [
          { name: 'Scholarship', min: 400, max: 600 },
          { name: 'Part-time work', min: 300, max: 500 },
        ],
        180, 180, 30,
      );
      await prisma.transaction.createMany({ data: txs });

      const emergencyGoal = await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Emergency Fund', targetAmount: 500, currentAmount: 500 },
      });
      await prisma.goalContribution.createMany({
        data: [
          { goalId: emergencyGoal.id, amount: 200, createdAt: daysBack(60) },
          { goalId: emergencyGoal.id, amount: 150, createdAt: daysBack(30) },
          { goalId: emergencyGoal.id, amount: 150, createdAt: daysBack(7) },
        ],
      });
      await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'New Laptop', targetAmount: 2500, currentAmount: 800 },
      });

      for (const [catName, limit] of [['Food', 300], ['Entertainment', 150]] as const) {
        const catId = catByName.get(catName);
        if (catId) await prisma.budget.create({
          data: { userId: user.id, categoryId: catId, amountLimit: limit, month: currentMonth, year: currentYear },
        }).catch(() => undefined);
      }
    }

    await awardChallenges(user.id, [
      { title: 'Record expenses for 7 consecutive days', status: UserChallengeStatus.COMPLETED, completedAt: daysBack(5) },
      { title: 'Save S/20 this week', status: UserChallengeStatus.ACTIVE },
    ]);
    await awardBadges(user.id, ['First Transaction', 'Goal Achieved']);
    await completeTopics(user.id, ['Personal Budget', 'Savings Habits', 'Inflation']);
    if (preSurvey) await createSurveyResponse(user.id, preSurvey.id, 60);
    await createRecommendations(user.id, [
      { type: RecommendationType.SAVINGS, message: 'You\'re spending 42% on needs. Try allocating 8% more to savings to reach the 20% target.', suggestedAction: 'Set a savings goal of S/130 this month.' },
      { type: RecommendationType.BUDGET, message: 'Your entertainment budget is at 78%. You have S/33 left this month.', suggestedAction: 'Limit entertainment outings to 2 this week.' },
    ]);

    console.log('✓ User 1 seeded: demo@zenda.app / Demo1234!');
  }

  // ═══════════════════════════════════════════════════════════════
  // USER 2 — ana.garcia@zenda.app (Ana García · responsible saver)
  // ═══════════════════════════════════════════════════════════════
  {
    let user = await prisma.user.findUnique({ where: { email: 'ana.garcia@zenda.app' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'ana.garcia@zenda.app', fullName: 'Ana García', passwordHash,
          age: 22, university: 'PUCP', incomeType: IncomeType.SCHOLARSHIP,
          averageMonthlyIncome: 850, financialLiteracyLevel: FinancialLiteracyLevel.HIGH,
          profileCompleted: true, consentGiven: true, consentAt: daysBack(90),
        },
      });
      // 4 months of data — expenses well below budget, income healthy
      const txs = buildTransactions(
        user.id,
        [
          { name: 'Food', min: 8, max: 28, weight: 4 },
          { name: 'Transportation', min: 3, max: 18, weight: 3 },
          { name: 'Entertainment', min: 10, max: 35, weight: 2 },
          { name: 'Shopping', min: 15, max: 80, weight: 2 },
          { name: 'Subscriptions', min: 20, max: 35, weight: 1 },
          { name: 'Health', min: 15, max: 50, weight: 1 },
          { name: 'Cravings', min: 4, max: 12, weight: 1 },
          { name: 'Savings', min: 50, max: 100, weight: 1 },
        ],
        [
          { name: 'Scholarship', min: 700, max: 900 },
          { name: 'Family', min: 150, max: 250 },
        ],
        120, 120, 20,
      );
      await prisma.transaction.createMany({ data: txs });

      const travelGoal = await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Viaje a Colombia', targetAmount: 2000, currentAmount: 1200 },
      });
      await prisma.goalContribution.createMany({
        data: [
          { goalId: travelGoal.id, amount: 300, createdAt: daysBack(90) },
          { goalId: travelGoal.id, amount: 300, createdAt: daysBack(60) },
          { goalId: travelGoal.id, amount: 300, createdAt: daysBack(30) },
          { goalId: travelGoal.id, amount: 300, createdAt: daysBack(10) },
        ],
      });
      await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Fondo de emergencia', targetAmount: 1000, currentAmount: 650 },
      });

      for (const [catName, limit] of [['Food', 250], ['Shopping', 200], ['Entertainment', 100]] as const) {
        const catId = catByName.get(catName);
        if (catId) await prisma.budget.create({
          data: { userId: user.id, categoryId: catId, amountLimit: limit, month: currentMonth, year: currentYear },
        }).catch(() => undefined);
      }
    }

    await awardChallenges(user.id, [
      { title: 'No delivery spending for 3 days', status: UserChallengeStatus.COMPLETED, completedAt: daysBack(20) },
      { title: 'Record expenses for 7 consecutive days', status: UserChallengeStatus.COMPLETED, completedAt: daysBack(15) },
      { title: 'Save S/20 this week', status: UserChallengeStatus.COMPLETED, completedAt: daysBack(8) },
      { title: 'Reduce entertainment spending by 10%', status: UserChallengeStatus.ACTIVE },
    ]);
    await awardBadges(user.id, ['First Transaction', 'Consistency', 'Goal Achieved', 'Challenger']);
    await completeTopics(user.id, ['Personal Budget', 'Savings Habits', 'Credit and Debt', 'Inflation', 'Interest Rates']);
    if (preSurvey) await createSurveyResponse(user.id, preSurvey.id, 80);
    if (postSurvey) await createSurveyResponse(user.id, postSurvey.id, 95);
    await createRecommendations(user.id, [
      { type: RecommendationType.GOAL, message: 'You\'re 60% towards your Colombia trip! At your current pace you\'ll reach it in 2 months.', suggestedAction: 'Increase your monthly contribution to S/350 to reach the goal one month early.' },
      { type: RecommendationType.SAVINGS, message: 'You consistently save over 20% each month. Consider opening a savings account to earn interest.', suggestedAction: 'Research high-yield savings options available to students in Peru.' },
    ]);

    console.log('✓ User 2 seeded: ana.garcia@zenda.app / Demo1234!');
  }

  // ═══════════════════════════════════════════════════════════════
  // USER 3 — carlos.mendoza@zenda.app (Carlos Mendoza · overspender)
  // ═══════════════════════════════════════════════════════════════
  {
    let user = await prisma.user.findUnique({ where: { email: 'carlos.mendoza@zenda.app' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'carlos.mendoza@zenda.app', fullName: 'Carlos Mendoza', passwordHash,
          age: 20, university: 'UPC', incomeType: IncomeType.FAMILY,
          averageMonthlyIncome: 500, financialLiteracyLevel: FinancialLiteracyLevel.LOW,
          profileCompleted: true, consentGiven: true, consentAt: daysBack(45),
        },
      });
      // 2 months of data — expenses exceed income, heavy food & entertainment
      // Historical (last month) data
      const txsHistory = buildTransactions(
        user.id,
        [
          { name: 'Food', min: 20, max: 50, weight: 5 },
          { name: 'Entertainment', min: 30, max: 80, weight: 4 },
          { name: 'Shopping', min: 30, max: 120, weight: 2 },
          { name: 'Cravings', min: 10, max: 30, weight: 3 },
          { name: 'Transportation', min: 5, max: 20, weight: 2 },
          { name: 'Housing', min: 300, max: 400, weight: 1 },
        ],
        [{ name: 'Family', min: 400, max: 550 }],
        60, 50, 6,
      );
      await prisma.transaction.createMany({ data: txsHistory });

      // Current-month bias: push Food well above 200 budget and Entertainment above 100
      const currentMonthExpenses: TxRow[] = [];
      const foodId = catByName.get('Food');
      const entId = catByName.get('Entertainment');
      const cravId = catByName.get('Cravings');
      if (foodId) {
        // ~280–320 food this month (budget is 200)
        for (let i = 0; i < 10; i++) currentMonthExpenses.push({
          userId: user.id, categoryId: foodId, type: TransactionType.EXPENSE,
          amount: rand(25, 38), currency: 'PEN', description: 'Food expense',
          occurredAt: daysBack(Math.floor(Math.random() * (now.getDate() - 1) + 1)),
        });
      }
      if (entId) {
        // ~180–220 entertainment this month (budget is 100)
        for (let i = 0; i < 7; i++) currentMonthExpenses.push({
          userId: user.id, categoryId: entId, type: TransactionType.EXPENSE,
          amount: rand(28, 38), currency: 'PEN', description: 'Entertainment expense',
          occurredAt: daysBack(Math.floor(Math.random() * (now.getDate() - 1) + 1)),
        });
      }
      if (cravId) {
        for (let i = 0; i < 5; i++) currentMonthExpenses.push({
          userId: user.id, categoryId: cravId, type: TransactionType.EXPENSE,
          amount: rand(12, 25), currency: 'PEN', description: 'Cravings expense',
          occurredAt: daysBack(Math.floor(Math.random() * (now.getDate() - 1) + 1)),
        });
      }
      if (currentMonthExpenses.length > 0) await prisma.transaction.createMany({ data: currentMonthExpenses });

      for (const [catName, limit] of [['Food', 200], ['Entertainment', 100]] as const) {
        const catId = catByName.get(catName);
        if (catId) await prisma.budget.create({
          data: { userId: user.id, categoryId: catId, amountLimit: limit, month: currentMonth, year: currentYear },
        }).catch(() => undefined);
      }
      // No goals — hasn't set any yet
    }

    await awardBadges(user.id, ['First Transaction']);
    // No challenges accepted, no education progress, no survey
    await createRecommendations(user.id, [
      { type: RecommendationType.BUDGET, message: 'You\'ve exceeded your Food budget by over 40% this month. That\'s S/80 over your S/200 limit.', suggestedAction: 'Cook at home at least 3 days this week to cut food costs.' },
      { type: RecommendationType.BUDGET, message: 'Entertainment spending is 180% of your monthly budget. Consider a no-spend weekend.', suggestedAction: 'Look for free events on campus this weekend.' },
    ]);

    console.log('✓ User 3 seeded: carlos.mendoza@zenda.app / Demo1234!');
  }

  // ═══════════════════════════════════════════════════════════════
  // USER 4 — lucia.torres@zenda.app (Lucia Torres · new user)
  // ═══════════════════════════════════════════════════════════════
  {
    let user = await prisma.user.findUnique({ where: { email: 'lucia.torres@zenda.app' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'lucia.torres@zenda.app', fullName: 'Lucia Torres', passwordHash,
          age: 19, university: 'UNI', incomeType: IncomeType.PART_TIME,
          averageMonthlyIncome: 350, financialLiteracyLevel: FinancialLiteracyLevel.LOW,
          profileCompleted: true, consentGiven: true, consentAt: daysBack(21),
        },
      });
      // Only 3 weeks of data — just getting started
      const txs = buildTransactions(
        user.id,
        [
          { name: 'Food', min: 6, max: 22, weight: 4 },
          { name: 'Transportation', min: 2, max: 12, weight: 3 },
          { name: 'Cravings', min: 4, max: 15, weight: 2 },
          { name: 'Shopping', min: 15, max: 60, weight: 1 },
        ],
        [{ name: 'Part-time work', min: 280, max: 380 }],
        21, 18, 3,
      );
      await prisma.transaction.createMany({ data: txs });

      const textbooksGoal = await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Libros del ciclo', targetAmount: 300, currentAmount: 50 },
      });
      await prisma.goalContribution.create({
        data: { goalId: textbooksGoal.id, amount: 50, createdAt: daysBack(5) },
      });

      const foodId = catByName.get('Food');
      if (foodId) await prisma.budget.create({
        data: { userId: user.id, categoryId: foodId, amountLimit: 150, month: currentMonth, year: currentYear },
      }).catch(() => undefined);
    }

    // No challenges, no badges, no education, no survey responses
    await createRecommendations(user.id, [
      { type: RecommendationType.SAVINGS, message: 'Great start! You\'ve recorded 3 weeks of expenses. Try setting a savings goal to build your financial habits.', suggestedAction: 'Set aside S/50 this month for your textbooks goal.' },
    ]);

    console.log('✓ User 4 seeded: lucia.torres@zenda.app / Demo1234!');
  }

  // ═══════════════════════════════════════════════════════════════
  // USER 5 — miguel.rios@zenda.app (Miguel Ríos · power user)
  // ═══════════════════════════════════════════════════════════════
  {
    let user = await prisma.user.findUnique({ where: { email: 'miguel.rios@zenda.app' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'miguel.rios@zenda.app', fullName: 'Miguel Ríos', passwordHash,
          age: 23, university: 'UNMSM', incomeType: IncomeType.MIXED,
          averageMonthlyIncome: 1500, financialLiteracyLevel: FinancialLiteracyLevel.HIGH,
          profileCompleted: true, consentGiven: true, consentAt: daysBack(180),
        },
      });
      // 6 months of dense data — healthy, consistent savings
      const txs = buildTransactions(
        user.id,
        [
          { name: 'Food', min: 8, max: 30, weight: 4 },
          { name: 'Transportation', min: 3, max: 20, weight: 3 },
          { name: 'Housing', min: 400, max: 550, weight: 1 },
          { name: 'Utilities', min: 40, max: 100, weight: 1 },
          { name: 'Shopping', min: 15, max: 80, weight: 2 },
          { name: 'Health', min: 20, max: 60, weight: 1 },
          { name: 'Subscriptions', min: 20, max: 40, weight: 1 },
          { name: 'Entertainment', min: 10, max: 40, weight: 2 },
          { name: 'Savings', min: 100, max: 200, weight: 2 },
        ],
        [
          { name: 'Scholarship', min: 600, max: 800 },
          { name: 'Part-time work', min: 500, max: 800 },
          { name: 'Family', min: 200, max: 300 },
        ],
        180, 220, 36,
      );
      await prisma.transaction.createMany({ data: txs });

      const mastersFund = await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Fondo Maestría', targetAmount: 8000, currentAmount: 3000 },
      });
      await prisma.goalContribution.createMany({
        data: [
          { goalId: mastersFund.id, amount: 500, createdAt: daysBack(150) },
          { goalId: mastersFund.id, amount: 500, createdAt: daysBack(120) },
          { goalId: mastersFund.id, amount: 500, createdAt: daysBack(90) },
          { goalId: mastersFund.id, amount: 500, createdAt: daysBack(60) },
          { goalId: mastersFund.id, amount: 500, createdAt: daysBack(30) },
          { goalId: mastersFund.id, amount: 500, createdAt: daysBack(7) },
        ],
      });

      const apartmentGoal = await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Depósito Apartamento', targetAmount: 6000, currentAmount: 2000 },
      });
      await prisma.goalContribution.createMany({
        data: [
          { goalId: apartmentGoal.id, amount: 500, createdAt: daysBack(90) },
          { goalId: apartmentGoal.id, amount: 750, createdAt: daysBack(60) },
          { goalId: apartmentGoal.id, amount: 750, createdAt: daysBack(30) },
        ],
      });

      const conferenceGoal = await prisma.savingsGoal.create({
        data: { userId: user.id, name: 'Conferencia Internacional', targetAmount: 1500, currentAmount: 1500 },
      });
      await prisma.goalContribution.createMany({
        data: [
          { goalId: conferenceGoal.id, amount: 500, createdAt: daysBack(60) },
          { goalId: conferenceGoal.id, amount: 500, createdAt: daysBack(40) },
          { goalId: conferenceGoal.id, amount: 500, createdAt: daysBack(20) },
        ],
      });

      for (const [catName, limit] of [['Food', 400], ['Transportation', 100], ['Entertainment', 200], ['Shopping', 300]] as const) {
        const catId = catByName.get(catName);
        if (catId) await prisma.budget.create({
          data: { userId: user.id, categoryId: catId, amountLimit: limit, month: currentMonth, year: currentYear },
        }).catch(() => undefined);
      }
    }

    // All challenges completed
    await awardChallenges(user.id, allChallenges.map((c) => ({
      title: c.title,
      status: UserChallengeStatus.COMPLETED,
      completedAt: daysBack(Math.floor(Math.random() * 60) + 5),
    })));

    // All badges
    await awardBadges(user.id, allBadges.map((b) => b.name));

    // All education topics completed
    for (const topicId of allTopicIds) {
      await prisma.userTopicProgress.upsert({
        where: { userId_topicId: { userId: user.id, topicId } },
        create: { userId: user.id, topicId, completedAt: daysBack(Math.floor(Math.random() * 30) + 5) },
        update: {},
      });
    }

    // Pre-survey (score 70) + post-survey (score 90 = 28.6% improvement)
    if (preSurvey) await createSurveyResponse(user.id, preSurvey.id, 70);
    if (postSurvey) await createSurveyResponse(user.id, postSurvey.id, 90);

    await createRecommendations(user.id, [
      { type: RecommendationType.GOAL, message: 'You\'re 37.5% toward your Masters Fund. Increasing monthly contributions by S/100 would shave 4 months off the timeline.', suggestedAction: 'Review non-essential subscriptions and redirect savings to this goal.' },
      { type: RecommendationType.SAVINGS, message: 'You\'ve saved consistently for 6 months. Your savings rate is 22% — right on target with the 50/30/20 rule.', suggestedAction: 'Consider low-risk investment options to make your savings work harder.' },
      { type: RecommendationType.BUDGET, message: 'Your Shopping category is at 68% this month with 10 days remaining. Good control.', suggestedAction: 'You have S/96 left in your shopping budget — hold off on non-essentials until next month.' },
    ]);

    console.log('✓ User 5 seeded: miguel.rios@zenda.app / Demo1234!');
  }

  console.log('\n📋 All pilot users ready (password for all: Demo1234!)');
  console.log('  demo@zenda.app       — balanced mid-literacy student');
  console.log('  ana.garcia@zenda.app — responsible saver, HIGH literacy, pre+post survey done');
  console.log('  carlos.mendoza@zenda.app — overspender, budgets exceeded, LOW literacy');
  console.log('  lucia.torres@zenda.app   — new user, 3 weeks data, minimal progress');
  console.log('  miguel.rios@zenda.app    — power user, all badges/challenges/topics, pre+post done');
}

// ─────────────────────────────────────────────────────────────────
// QUIZ QUESTIONS — bilingual pool (US-1004)
// Each group has an EN and ES row sharing the same questionGroupKey.
// Topics are looked up by title to get their DB id.
// ─────────────────────────────────────────────────────────────────

type QuizQuestionSeedEntry = {
  topicTitle: string;
  questionGroupKey: string;
  difficulty: QuizDifficulty;
  en: { text: string; options: string[]; correctAnswer: string };
  es: { text: string; options: string[]; correctAnswer: string };
};

const QUIZ_QUESTIONS: QuizQuestionSeedEntry[] = [
  // ── Topic 1: Personal Budget ─────────────────────────────────────
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_5030_20_pct',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'In the 50/30/20 rule, what percentage of income is allocated to "needs"?',
      options: ['50%', '30%', '20%', '40%'],
      correctAnswer: '50%',
    },
    es: {
      text: 'En la regla 50/30/20, ¿qué porcentaje del ingreso se destina a "necesidades"?',
      options: ['50%', '30%', '20%', '40%'],
      correctAnswer: '50%',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_savings_amount',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'If your monthly income is S/1,000, how much goes to savings under the 50/30/20 rule?',
      options: ['S/200', 'S/300', 'S/500', 'S/100'],
      correctAnswer: 'S/200',
    },
    es: {
      text: 'Si tu ingreso mensual es S/1,000, ¿cuánto va al ahorro según la regla 50/30/20?',
      options: ['S/200', 'S/300', 'S/500', 'S/100'],
      correctAnswer: 'S/200',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_need_example',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Which of the following is a "need" in the 50/30/20 rule?',
      options: ['Netflix subscription', 'Dining out with friends', 'Rent or housing payment', 'New sneakers'],
      correctAnswer: 'Rent or housing payment',
    },
    es: {
      text: '¿Cuál de los siguientes es una "necesidad" en la regla 50/30/20?',
      options: ['Suscripción de Netflix', 'Salir a comer con amigos', 'Pago de alquiler o vivienda', 'Zapatillas nuevas'],
      correctAnswer: 'Pago de alquiler o vivienda',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_irregular_income',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'A student has irregular income (scholarship + part-time work). How should they apply the 50/30/20 rule?',
      options: [
        'Apply it only in months they receive income',
        'Apply it to their average monthly income over 3–6 months',
        'Skip the rule until income is stable',
        'Apply 50/30/20 to each income source separately',
      ],
      correctAnswer: 'Apply it to their average monthly income over 3–6 months',
    },
    es: {
      text: 'Un estudiante tiene ingresos irregulares (beca + trabajo a tiempo parcial). ¿Cómo aplica la regla 50/30/20?',
      options: [
        'Aplicarla solo en los meses que recibe ingresos',
        'Aplicarla al promedio de ingresos mensuales de 3 a 6 meses',
        'Ignorar la regla hasta tener ingresos estables',
        'Aplicar 50/30/20 a cada fuente de ingreso por separado',
      ],
      correctAnswer: 'Aplicarla al promedio de ingresos mensuales de 3 a 6 meses',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_subscriptions_bucket',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Under the 50/30/20 framework, which bucket do streaming subscriptions (Netflix, Spotify) belong to?',
      options: ['Needs (50%)', 'Wants (30%)', 'Savings (20%)', 'It depends on usage'],
      correctAnswer: 'Wants (30%)',
    },
    es: {
      text: 'Bajo el marco 50/30/20, ¿en qué categoría caen las suscripciones de streaming (Netflix, Spotify)?',
      options: ['Necesidades (50%)', 'Deseos (30%)', 'Ahorro (20%)', 'Depende del uso'],
      correctAnswer: 'Deseos (30%)',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_overspend_needs',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'You earn S/1,500/month and spend S/900 on needs. Are you following the 50/30/20 rule for needs?',
      options: [
        'Yes, S/900 is within 50% of income',
        'No, 50% of S/1,500 = S/750, so you are S/150 over',
        'Yes, as long as wants and savings stay at 30% and 20%',
        'It cannot be determined without knowing total spending',
      ],
      correctAnswer: 'No, 50% of S/1,500 = S/750, so you are S/150 over',
    },
    es: {
      text: 'Ganas S/1,500 al mes y gastas S/900 en necesidades. ¿Estás siguiendo la regla 50/30/20 en necesidades?',
      options: [
        'Sí, S/900 está dentro del 50% del ingreso',
        'No, el 50% de S/1,500 = S/750, por lo que estás S/150 por encima',
        'Sí, siempre que los deseos y el ahorro se mantengan en 30% y 20%',
        'No se puede determinar sin conocer el gasto total',
      ],
      correctAnswer: 'No, el 50% de S/1,500 = S/750, por lo que estás S/150 por encima',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_real_purchasing_power',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'Peru\'s inflation was 8.8% in 2022. What does this mean for a fixed monthly budget of S/1,000?',
      options: [
        'You can buy 8.8% more goods with the same money',
        'Your real purchasing power decreased — S/1,000 buys less than it did a year ago',
        'Your budget should automatically increase by 8.8%',
        'It only affects imported goods, not daily expenses',
      ],
      correctAnswer: 'Your real purchasing power decreased — S/1,000 buys less than it did a year ago',
    },
    es: {
      text: 'La inflación en Perú fue de 8.8% en 2022. ¿Qué significa esto para un presupuesto mensual fijo de S/1,000?',
      options: [
        'Puedes comprar un 8.8% más de bienes con el mismo dinero',
        'Tu poder adquisitivo real disminuyó: S/1,000 compra menos que hace un año',
        'Tu presupuesto debería aumentar automáticamente un 8.8%',
        'Solo afecta a los bienes importados, no a los gastos diarios',
      ],
      correctAnswer: 'Tu poder adquisitivo real disminuyó: S/1,000 compra menos que hace un año',
    },
  },
  {
    topicTitle: 'Personal Budget',
    questionGroupKey: 'budget_zero_based',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'In zero-based budgeting, what must the result of income minus all budget allocations equal?',
      options: ['As much as possible to maximize savings', 'Zero — every sol is assigned a purpose', 'At least 20% for unexpected expenses', 'Negative — spend more to stimulate the economy'],
      correctAnswer: 'Zero — every sol is assigned a purpose',
    },
    es: {
      text: 'En el presupuesto base cero, ¿a cuánto debe ser igual el resultado de ingreso menos todas las asignaciones presupuestarias?',
      options: ['Lo más posible para maximizar el ahorro', 'Cero: cada sol tiene un propósito asignado', 'Al menos 20% para gastos imprevistos', 'Negativo: gastar más para estimular la economía'],
      correctAnswer: 'Cero: cada sol tiene un propósito asignado',
    },
  },

  // ── Topic 2: Savings Habits ──────────────────────────────────────
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_pay_yourself_first',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'What does "pay yourself first" mean in personal finance?',
      options: [
        'Spend on luxuries before paying bills',
        'Save a portion of income before spending on anything else',
        'Pay off all debts before saving',
        'Give yourself a weekly cash allowance',
      ],
      correctAnswer: 'Save a portion of income before spending on anything else',
    },
    es: {
      text: '¿Qué significa "págate a ti mismo primero" en finanzas personales?',
      options: [
        'Gastar en lujos antes de pagar facturas',
        'Ahorrar una parte del ingreso antes de gastar en cualquier otra cosa',
        'Pagar todas las deudas antes de ahorrar',
        'Darte una asignación semanal en efectivo',
      ],
      correctAnswer: 'Ahorrar una parte del ingreso antes de gastar en cualquier otra cosa',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_weekly_annual',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'If you save S/10 per week, approximately how much will you have after one year?',
      options: ['S/240', 'S/360', 'S/520', 'S/1,200'],
      correctAnswer: 'S/520',
    },
    es: {
      text: 'Si ahorras S/10 por semana, ¿aproximadamente cuánto tendrás después de un año?',
      options: ['S/240', 'S/360', 'S/520', 'S/1,200'],
      correctAnswer: 'S/520',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_emergency_fund',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'A financial emergency fund should ideally cover how many months of expenses?',
      options: ['1 month', '2 months', '3 to 6 months', '12 months'],
      correctAnswer: '3 to 6 months',
    },
    es: {
      text: 'Un fondo de emergencia financiero debería cubrir idealmente cuántos meses de gastos?',
      options: ['1 mes', '2 meses', '3 a 6 meses', '12 meses'],
      correctAnswer: '3 a 6 meses',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_rule_of_72',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Using the Rule of 72, at 6% TEA, how many years does it take to double your savings?',
      options: ['6 years', '12 years', '18 years', '72 years'],
      correctAnswer: '12 years',
    },
    es: {
      text: 'Usando la Regla del 72, al 6% TEA, ¿cuántos años se necesitan para duplicar tus ahorros?',
      options: ['6 años', '12 años', '18 años', '72 años'],
      correctAnswer: '12 años',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_compounding',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'What does "compound interest" mean for a savings account?',
      options: [
        'You earn interest only on the original deposit',
        'You earn interest on both the principal and previously earned interest',
        'Interest is calculated and paid only at year-end',
        'The bank charges you a fee on top of interest',
      ],
      correctAnswer: 'You earn interest on both the principal and previously earned interest',
    },
    es: {
      text: '¿Qué significa "interés compuesto" para una cuenta de ahorros?',
      options: [
        'Solo ganas interés sobre el depósito original',
        'Ganas interés tanto sobre el capital como sobre los intereses ya ganados',
        'El interés se calcula y paga solo al final del año',
        'El banco te cobra una comisión además del interés',
      ],
      correctAnswer: 'Ganas interés tanto sobre el capital como sobre los intereses ya ganados',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_fsd_protection',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'In Peru, the Fondo de Seguro de Depósitos (FSD) protects savings in regulated banks up to approximately:',
      options: ['S/50,000', 'S/80,000', 'S/120,000', 'S/500,000'],
      correctAnswer: 'S/120,000',
    },
    es: {
      text: 'En Perú, el Fondo de Seguro de Depósitos (FSD) protege los ahorros en bancos regulados hasta aproximadamente:',
      options: ['S/50,000', 'S/80,000', 'S/120,000', 'S/500,000'],
      correctAnswer: 'S/120,000',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_real_return',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'Your savings account earns 3% TEA and inflation is 5%. What is your real return?',
      options: ['8%', '3%', '-2%', '0%'],
      correctAnswer: '-2%',
    },
    es: {
      text: 'Tu cuenta de ahorros gana 3% TEA y la inflación es del 5%. ¿Cuál es tu rendimiento real?',
      options: ['8%', '3%', '-2%', '0%'],
      correctAnswer: '-2%',
    },
  },
  {
    topicTitle: 'Savings Habits',
    questionGroupKey: 'savings_coopac_risk',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'A small cooperative (COOPAC) in Peru offers 9% TEA on savings. Compared to a BCP account at 5%, what is the main risk?',
      options: [
        'COOPAC rates cannot be that high legally',
        'COOPAC deposits may NOT be covered by the FSD, unlike bank deposits',
        'Cooperatives in Peru are not allowed to take savings deposits',
        'There is no risk — SBS supervises all COOPACs equally',
      ],
      correctAnswer: 'COOPAC deposits may NOT be covered by the FSD, unlike bank deposits',
    },
    es: {
      text: 'Una COOPAC en Perú ofrece 9% TEA en ahorros. En comparación con una cuenta BCP al 5%, ¿cuál es el riesgo principal?',
      options: [
        'Las tasas de COOPAC no pueden ser tan altas legalmente',
        'Los depósitos en COOPAC pueden NO estar cubiertos por el FSD, a diferencia de los depósitos bancarios',
        'Las cooperativas en Perú no pueden captar depósitos de ahorro',
        'No hay riesgo: la SBS supervisa a todas las COOPAC por igual',
      ],
      correctAnswer: 'Los depósitos en COOPAC pueden NO estar cubiertos por el FSD, a diferencia de los depósitos bancarios',
    },
  },

  // ── Topic 3: Credit and Debt ────────────────────────────────────
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_tea_definition',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'What does TEA stand for in Peruvian banking?',
      options: ['Tasa Estándar Anual', 'Tasa Efectiva Anual', 'Total de Endeudamiento Autorizado', 'Tasa de Evaluación Anual'],
      correctAnswer: 'Tasa Efectiva Anual',
    },
    es: {
      text: '¿Qué significa TEA en la banca peruana?',
      options: ['Tasa Estándar Anual', 'Tasa Efectiva Anual', 'Total de Endeudamiento Autorizado', 'Tasa de Evaluación Anual'],
      correctAnswer: 'Tasa Efectiva Anual',
    },
  },
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_card_rates_peru',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'What is the typical annual interest rate (TEA) for credit cards in Peru?',
      options: ['5%–15%', '15%–30%', '40%–80%', 'Over 100%'],
      correctAnswer: '40%–80%',
    },
    es: {
      text: '¿Cuál es la tasa de interés anual (TEA) típica de las tarjetas de crédito en Perú?',
      options: ['5%–15%', '15%–30%', '40%–80%', 'Más del 100%'],
      correctAnswer: '40%–80%',
    },
  },
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_minimum_payment',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'The minimum credit card payment in Peru is typically what percentage of the outstanding balance?',
      options: ['1%–2%', '5%–8%', '15%–20%', '50%'],
      correctAnswer: '5%–8%',
    },
    es: {
      text: 'El pago mínimo de la tarjeta de crédito en Perú es normalmente qué porcentaje del saldo pendiente?',
      options: ['1%–2%', '5%–8%', '15%–20%', '50%'],
      correctAnswer: '5%–8%',
    },
  },
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_tea_vs_tcea',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'What is the difference between TEA and TCEA when comparing loans?',
      options: [
        'They are the same — both measure the total annual cost',
        'TEA includes all fees and charges; TCEA is only the interest rate',
        'TCEA includes all fees and charges; TEA is only the interest component',
        'TCEA applies to savings accounts; TEA applies to loans',
      ],
      correctAnswer: 'TCEA includes all fees and charges; TEA is only the interest component',
    },
    es: {
      text: '¿Cuál es la diferencia entre TEA y TCEA al comparar préstamos?',
      options: [
        'Son iguales: ambos miden el costo anual total',
        'La TEA incluye todas las comisiones; la TCEA es solo la tasa de interés',
        'La TCEA incluye todas las comisiones; la TEA es solo el componente de interés',
        'La TCEA aplica a las cuentas de ahorro; la TEA aplica a los préstamos',
      ],
      correctAnswer: 'La TCEA incluye todas las comisiones; la TEA es solo el componente de interés',
    },
  },
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_good_vs_bad_debt',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Which is an example of "good debt" in financial terms?',
      options: [
        'Buying new shoes on a credit card you cannot pay off next month',
        'A student loan to fund university education that increases earning potential',
        'Using a cash advance to pay for a vacation',
        'Borrowing to buy a luxury item on sale',
      ],
      correctAnswer: 'A student loan to fund university education that increases earning potential',
    },
    es: {
      text: '¿Cuál es un ejemplo de "deuda buena" en términos financieros?',
      options: [
        'Comprar ropa nueva con tarjeta que no podrás pagar el próximo mes',
        'Un préstamo estudiantil para financiar estudios universitarios que incrementa el potencial de ingresos',
        'Usar un adelanto de efectivo para pagar unas vacaciones',
        'Pedir prestado para comprar un artículo de lujo en oferta',
      ],
      correctAnswer: 'Un préstamo estudiantil para financiar estudios universitarios que incrementa el potencial de ingresos',
    },
  },
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_flat_rate_tea',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'A lender offers a loan at "4% monthly flat rate." What is the approximate TEA?',
      options: ['4%', '48%', '60%', '79.6%'],
      correctAnswer: '60%',
    },
    es: {
      text: 'Un prestamista ofrece un préstamo a "4% de tasa plana mensual." ¿Cuál es la TEA aproximada?',
      options: ['4%', '48%', '60%', '79.6%'],
      correctAnswer: '60%',
    },
  },
  {
    topicTitle: 'Credit and Debt',
    questionGroupKey: 'credit_sbs_publication',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'The SBS requires all lenders to publish the total true cost of a loan including all fees. This metric is called:',
      options: ['TEA', 'TNA', 'TCEA', 'TREA'],
      correctAnswer: 'TCEA',
    },
    es: {
      text: 'La SBS obliga a todos los prestamistas a publicar el costo total real de un préstamo, incluyendo todas las comisiones. Esta métrica se llama:',
      options: ['TEA', 'TNA', 'TCEA', 'TREA'],
      correctAnswer: 'TCEA',
    },
  },

  // ── Topic 4: Inflation ──────────────────────────────────────────
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_definition',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'What is inflation?',
      options: [
        'An increase in personal income over time',
        'A general increase in prices that reduces purchasing power',
        'A government tax on bank deposits',
        'The interest rate on government bonds',
      ],
      correctAnswer: 'A general increase in prices that reduces purchasing power',
    },
    es: {
      text: '¿Qué es la inflación?',
      options: [
        'Un aumento en los ingresos personales con el tiempo',
        'Un aumento general de precios que reduce el poder adquisitivo',
        'Un impuesto gubernamental sobre los depósitos bancarios',
        'La tasa de interés de los bonos del gobierno',
      ],
      correctAnswer: 'Un aumento general de precios que reduce el poder adquisitivo',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_bcrp_controls',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Which institution is responsible for controlling inflation in Peru?',
      options: ['SBS', 'SUNAT', 'BCRP', 'MEF'],
      correctAnswer: 'BCRP',
    },
    es: {
      text: '¿Qué institución es responsable de controlar la inflación en Perú?',
      options: ['SBS', 'SUNAT', 'BCRP', 'MEF'],
      correctAnswer: 'BCRP',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_bcrp_target',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: "Peru's BCRP inflation target is:",
      options: ['0% (price stability means zero inflation)', '2% ± 1 percentage point (range: 1%–3%)', '5% ± 2 percentage points', '10% maximum'],
      correctAnswer: '2% ± 1 percentage point (range: 1%–3%)',
    },
    es: {
      text: 'La meta de inflación del BCRP de Perú es:',
      options: ['0% (estabilidad de precios significa inflación cero)', '2% ± 1 punto porcentual (rango: 1%–3%)', '5% ± 2 puntos porcentuales', 'Máximo 10%'],
      correctAnswer: '2% ± 1 punto porcentual (rango: 1%–3%)',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_2022_peak',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: "Peru's inflation peaked in 2022 at approximately:",
      options: ['2.5%', '5.0%', '8.8%', '15.0%'],
      correctAnswer: '8.8%',
    },
    es: {
      text: 'La inflación en Perú alcanzó su máximo en 2022 en aproximadamente:',
      options: ['2.5%', '5.0%', '8.8%', '15.0%'],
      correctAnswer: '8.8%',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_savings_real_return',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'If you earn 3% TEA on your savings and inflation is 5%, what happens to your purchasing power?',
      options: [
        'It grows at 8% (combined rate)',
        'It stays the same — interest offsets inflation',
        'It decreases by approximately 2% per year in real terms',
        'It depends on the bank, not the interest rate',
      ],
      correctAnswer: 'It decreases by approximately 2% per year in real terms',
    },
    es: {
      text: 'Si ganas 3% TEA en tus ahorros y la inflación es del 5%, ¿qué ocurre con tu poder adquisitivo?',
      options: [
        'Crece al 8% (tasa combinada)',
        'Se mantiene igual: el interés compensa la inflación',
        'Disminuye aproximadamente un 2% al año en términos reales',
        'Depende del banco, no de la tasa de interés',
      ],
      correctAnswer: 'Disminuye aproximadamente un 2% al año en términos reales',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_bcrp_reference_rate',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'The BCRP raised its reference rate aggressively in 2022–2023 to combat high inflation. What was the peak rate?',
      options: ['2%', '5%', '7.75%', '12%'],
      correctAnswer: '7.75%',
    },
    es: {
      text: 'El BCRP elevó agresivamente su tasa de referencia en 2022–2023 para combatir la alta inflación. ¿Cuál fue la tasa máxima?',
      options: ['2%', '5%', '7.75%', '12%'],
      correctAnswer: '7.75%',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_purchasing_power_calc',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'If inflation is 2% per year and you hold S/10,000 in cash (earning nothing), approximately how much purchasing power do you have after 3 years?',
      options: ['S/10,600', 'S/10,000', 'S/9,423', 'S/8,000'],
      correctAnswer: 'S/9,423',
    },
    es: {
      text: 'Si la inflación es del 2% anual y tienes S/10,000 en efectivo (sin ganar nada), ¿cuánto poder adquisitivo tienes aproximadamente después de 3 años?',
      options: ['S/10,600', 'S/10,000', 'S/9,423', 'S/8,000'],
      correctAnswer: 'S/9,423',
    },
  },
  {
    topicTitle: 'Inflation',
    questionGroupKey: 'inflation_rate_credit_effect',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'When the BCRP raises its reference rate, what typically happens to consumer credit rates (credit cards, loans)?',
      options: [
        'Consumer credit rates fall, making borrowing cheaper',
        'Consumer credit rates tend to rise as banks pass higher costs to borrowers',
        'Consumer credit rates are unaffected by the BCRP reference rate',
        'Only mortgage rates change; credit cards are regulated separately',
      ],
      correctAnswer: 'Consumer credit rates tend to rise as banks pass higher costs to borrowers',
    },
    es: {
      text: 'Cuando el BCRP sube su tasa de referencia, ¿qué suele ocurrir con las tasas de crédito al consumo (tarjetas, préstamos)?',
      options: [
        'Las tasas de crédito al consumo bajan, abaratando el endeudamiento',
        'Las tasas de crédito al consumo tienden a subir, pues los bancos trasladan el mayor costo a los prestatarios',
        'Las tasas de crédito al consumo no se ven afectadas por la tasa de referencia del BCRP',
        'Solo cambian las tasas hipotecarias; las tarjetas se regulan por separado',
      ],
      correctAnswer: 'Las tasas de crédito al consumo tienden a subir, pues los bancos trasladan el mayor costo a los prestatarios',
    },
  },

  // ── Topic 5: Interest Rates ─────────────────────────────────────
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_tea_stands_for',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'TEA stands for Tasa Efectiva Anual. Why is it more useful than TNA (Tasa Nominal Anual)?',
      options: [
        'TEA is used only for savings; TNA is used for loans',
        'TEA accounts for compounding, giving the true annual cost or return',
        'TEA is set by the government; TNA is set by banks',
        'They are identical — just different names',
      ],
      correctAnswer: 'TEA accounts for compounding, giving the true annual cost or return',
    },
    es: {
      text: 'TEA significa Tasa Efectiva Anual. ¿Por qué es más útil que la TNA (Tasa Nominal Anual)?',
      options: [
        'La TEA se usa solo para ahorros; la TNA se usa para préstamos',
        'La TEA considera el efecto del interés compuesto, dando el costo o rendimiento anual real',
        'La TEA la fija el gobierno; la TNA la fijan los bancos',
        'Son idénticas: solo tienen nombres diferentes',
      ],
      correctAnswer: 'La TEA considera el efecto del interés compuesto, dando el costo o rendimiento anual real',
    },
  },
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_rule_72',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'The Rule of 72 says: divide 72 by the annual interest rate to estimate how many years it takes to:',
      options: ['Pay off a loan', 'Double your investment', 'Reach inflation target', 'Calculate monthly payments'],
      correctAnswer: 'Double your investment',
    },
    es: {
      text: 'La Regla del 72 dice: divide 72 entre la tasa de interés anual para estimar cuántos años tardarás en:',
      options: ['Pagar un préstamo', 'Duplicar tu inversión', 'Alcanzar la meta de inflación', 'Calcular pagos mensuales'],
      correctAnswer: 'Duplicar tu inversión',
    },
  },
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_tem_to_tea',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'A loan has a TEM (monthly effective rate) of 4%. What is the approximate TEA?',
      options: ['4%', '48%', '60.1%', '12%'],
      correctAnswer: '60.1%',
    },
    es: {
      text: 'Un préstamo tiene una TEM (tasa efectiva mensual) del 4%. ¿Cuál es la TEA aproximada?',
      options: ['4%', '48%', '60.1%', '12%'],
      correctAnswer: '60.1%',
    },
  },
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_trea_savings',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'When comparing savings accounts in Peru, which metric gives the true annual return after fees?',
      options: ['TNA', 'TEA', 'TREA', 'TCEA'],
      correctAnswer: 'TREA',
    },
    es: {
      text: 'Al comparar cuentas de ahorro en Perú, ¿qué métrica refleja el rendimiento anual real después de comisiones?',
      options: ['TNA', 'TEA', 'TREA', 'TCEA'],
      correctAnswer: 'TREA',
    },
  },
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_rule72_at_6pct',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'At 6% TEA, using the Rule of 72, your money doubles in approximately how many years?',
      options: ['6 years', '10 years', '12 years', '15 years'],
      correctAnswer: '12 years',
    },
    es: {
      text: 'Al 6% TEA, usando la Regla del 72, tu dinero se duplica en aproximadamente cuántos años?',
      options: ['6 años', '10 años', '12 años', '15 años'],
      correctAnswer: '12 años',
    },
  },
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_tna_to_tea_monthly',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'A savings account offers 5% TNA compounded monthly. What is the approximate TEA?',
      options: ['5.00%', '5.12%', '5.50%', '4.88%'],
      correctAnswer: '5.12%',
    },
    es: {
      text: 'Una cuenta de ahorros ofrece 5% TNA capitalizada mensualmente. ¿Cuál es la TEA aproximada?',
      options: ['5.00%', '5.12%', '5.50%', '4.88%'],
      correctAnswer: '5.12%',
    },
  },
  {
    topicTitle: 'Interest Rates',
    questionGroupKey: 'interest_bcrp_rate_effect_deposits',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'When the BCRP reference rate rose from 0.25% to 7.75% (2021–2023), what typically happened to fixed-term deposit rates?',
      options: [
        'They stayed the same — deposit rates are fixed by SBS',
        'They increased as banks competed to attract depositors at higher market rates',
        'They decreased as banks wanted to discourage saving',
        'Only credit card rates were affected',
      ],
      correctAnswer: 'They increased as banks competed to attract depositors at higher market rates',
    },
    es: {
      text: 'Cuando la tasa de referencia del BCRP subió de 0.25% a 7.75% (2021–2023), ¿qué pasó típicamente con las tasas de depósito a plazo fijo?',
      options: [
        'Se mantuvieron igual: la SBS fija las tasas de depósito',
        'Aumentaron porque los bancos competían para atraer depositantes a tasas más altas de mercado',
        'Bajaron porque los bancos querían desincentivar el ahorro',
        'Solo se afectaron las tasas de tarjetas de crédito',
      ],
      correctAnswer: 'Aumentaron porque los bancos competían para atraer depositantes a tasas más altas de mercado',
    },
  },

  // ── Topic 6: Basic Investing ────────────────────────────────────
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_smv_regulates',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Which institution regulates fondos mutuos (mutual funds) in Peru?',
      options: ['SBS', 'BCRP', 'SMV', 'SUNAT'],
      correctAnswer: 'SMV',
    },
    es: {
      text: '¿Qué institución regula los fondos mutuos en Perú?',
      options: ['SBS', 'BCRP', 'SMV', 'SUNAT'],
      correctAnswer: 'SMV',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_afp_young_fund',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Which AFP fund type is most appropriate for a 22-year-old just starting their career?',
      options: ['Fondo 0 (capital preservation)', 'Fondo 1 (conservative)', 'Fondo 2 (balanced)', 'Fondo 3 (aggressive growth)'],
      correctAnswer: 'Fondo 3 (aggressive growth)',
    },
    es: {
      text: '¿Qué tipo de fondo AFP es más apropiado para una persona de 22 años que recién empieza su carrera?',
      options: ['Fondo 0 (preservación de capital)', 'Fondo 1 (conservador)', 'Fondo 2 (balanceado)', 'Fondo 3 (crecimiento agresivo)'],
      correctAnswer: 'Fondo 3 (crecimiento agresivo)',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_diversification',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'In investing, "diversification" means:',
      options: [
        'Putting all your money in the single best-performing asset',
        'Spreading money across different assets to reduce risk',
        'Only investing in safe government bonds',
        'Avoiding any investment with risk',
      ],
      correctAnswer: 'Spreading money across different assets to reduce risk',
    },
    es: {
      text: 'En inversiones, "diversificación" significa:',
      options: [
        'Poner todo tu dinero en el activo de mejor rendimiento',
        'Distribuir el dinero entre diferentes activos para reducir el riesgo',
        'Solo invertir en bonos del gobierno seguros',
        'Evitar cualquier inversión con riesgo',
      ],
      correctAnswer: 'Distribuir el dinero entre diferentes activos para reducir el riesgo',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_fondos_mutuos_minimum',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'What is the typical minimum investment to access a fondo mutuo in Peru?',
      options: ['S/5,000', 'S/1,000', 'S/100–S/500', 'S/10,000'],
      correctAnswer: 'S/100–S/500',
    },
    es: {
      text: '¿Cuál es la inversión mínima típica para acceder a un fondo mutuo en Perú?',
      options: ['S/5,000', 'S/1,000', 'S/100–S/500', 'S/10,000'],
      correctAnswer: 'S/100–S/500',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_fondos_mutuos_tax',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Capital gains (rendimientos) from fondos mutuos in Peru are subject to what income tax rate for individuals?',
      options: ['0% — investment gains are tax-free', '5% (IR de Segunda Categoría)', '15%', '29.5% (corporate rate)'],
      correctAnswer: '5% (IR de Segunda Categoría)',
    },
    es: {
      text: 'Las ganancias de capital (rendimientos) de fondos mutuos en Perú están sujetas a qué tasa de impuesto a la renta para personas naturales?',
      options: ['0%: las ganancias de inversión están exentas de impuestos', '5% (IR de Segunda Categoría)', '15%', '29.5% (tasa corporativa)'],
      correctAnswer: '5% (IR de Segunda Categoría)',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_sbs_vs_smv',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'You want to open a brokerage account to buy shares on the Bolsa de Valores de Lima. Which regulator oversees this?',
      options: ['SBS (Superintendencia de Banca, Seguros y AFP)', 'SMV (Superintendencia del Mercado de Valores)', 'BCRP (Banco Central de Reserva)', 'SUNAT (tax authority)'],
      correctAnswer: 'SMV (Superintendencia del Mercado de Valores)',
    },
    es: {
      text: 'Quieres abrir una cuenta de corretaje para comprar acciones en la Bolsa de Valores de Lima. ¿Qué regulador supervisa esto?',
      options: ['SBS (Superintendencia de Banca, Seguros y AFP)', 'SMV (Superintendencia del Mercado de Valores)', 'BCRP (Banco Central de Reserva)', 'SUNAT (autoridad tributaria)'],
      correctAnswer: 'SMV (Superintendencia del Mercado de Valores)',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_nuam_exchange',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'In 2024, the BVL (Bolsa de Valores de Lima) merged into a regional exchange called:',
      options: ['LatAm Exchange', 'Bolsa Pacífico', 'Nuam Exchange', 'MercadoAbierto'],
      correctAnswer: 'Nuam Exchange',
    },
    es: {
      text: 'En 2024, la BVL (Bolsa de Valores de Lima) se fusionó en una bolsa regional llamada:',
      options: ['LatAm Exchange', 'Bolsa Pacífico', 'Nuam Exchange', 'MercadoAbierto'],
      correctAnswer: 'Nuam Exchange',
    },
  },
  {
    topicTitle: 'Basic Investing',
    questionGroupKey: 'invest_afp_withdrawal_impact',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'Between 2020 and 2022, Congress authorized multiple AFP fund withdrawals. What was the long-term financial impact for those who withdrew?',
      options: [
        'No impact — AFP contributions are protected by the government',
        'Loss of decades of compound growth; approximately 40% of affiliates have near-zero balances',
        'Minor impact — the AFP refills the accounts from national reserves',
        'Positive impact — the money earns more in savings accounts than AFP Fondo 3',
      ],
      correctAnswer: 'Loss of decades of compound growth; approximately 40% of affiliates have near-zero balances',
    },
    es: {
      text: 'Entre 2020 y 2022, el Congreso autorizó múltiples retiros de fondos AFP. ¿Cuál fue el impacto financiero a largo plazo para quienes retiraron?',
      options: [
        'Ningún impacto: las contribuciones AFP están respaldadas por el gobierno',
        'Pérdida de décadas de crecimiento compuesto; aproximadamente el 40% de los afiliados tienen saldos casi nulos',
        'Impacto menor: la AFP repone las cuentas con reservas nacionales',
        'Impacto positivo: el dinero rinde más en cuentas de ahorro que en AFP Fondo 3',
      ],
      correctAnswer: 'Pérdida de décadas de crecimiento compuesto; aproximadamente el 40% de los afiliados tienen saldos casi nulos',
    },
  },

  // ── Topic 7: Responsible Consumption ────────────────────────────
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_24hr_rule',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'The "24-hour rule" in responsible spending means:',
      options: [
        'Only shop during 24-hour sales',
        'Wait 24 hours before making any non-essential purchase above S/50',
        'Pay all bills within 24 hours of receiving them',
        'Save 24% of every purchase amount',
      ],
      correctAnswer: 'Wait 24 hours before making any non-essential purchase above S/50',
    },
    es: {
      text: 'La "regla de las 24 horas" en el gasto responsable significa:',
      options: [
        'Comprar solo durante las ventas de 24 horas',
        'Esperar 24 horas antes de realizar cualquier compra no esencial por encima de S/50',
        'Pagar todas las facturas dentro de las 24 horas de recibirlas',
        'Ahorrar el 24% de cada compra',
      ],
      correctAnswer: 'Esperar 24 horas antes de realizar cualquier compra no esencial por encima de S/50',
    },
  },
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_want_example',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Which of the following is a "want" (not a need) for a university student?',
      options: ['Bus fare to university', 'Monthly internet data plan', 'Concert ticket for a band you like', 'Textbooks required for class'],
      correctAnswer: 'Concert ticket for a band you like',
    },
    es: {
      text: '¿Cuál de los siguientes es un "deseo" (no una necesidad) para un estudiante universitario?',
      options: ['Pasaje de bus a la universidad', 'Plan de datos internet mensual', 'Entrada a un concierto de una banda que te gusta', 'Libros de texto requeridos para clases'],
      correctAnswer: 'Entrada a un concierto de una banda que te gusta',
    },
  },
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_impulse_buying',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Impulse buying is best described as:',
      options: [
        'Planned purchases made quickly to save time',
        'Unplanned purchases driven by emotion rather than need',
        'Buying in bulk to get a better price',
        'Purchasing items when they are on sale',
      ],
      correctAnswer: 'Unplanned purchases driven by emotion rather than need',
    },
    es: {
      text: 'Las compras impulsivas se describen mejor como:',
      options: [
        'Compras planificadas realizadas rápidamente para ahorrar tiempo',
        'Compras no planificadas impulsadas por emociones en lugar de necesidades',
        'Comprar al por mayor para obtener un mejor precio',
        'Comprar artículos cuando están en oferta',
      ],
      correctAnswer: 'Compras no planificadas impulsadas por emociones en lugar de necesidades',
    },
  },
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_opportunity_cost',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'You spend S/200 on an impulse purchase. In financial terms, the "opportunity cost" of this purchase is:',
      options: [
        'S/200 in lost savings or other needs that could have been covered',
        'The time it took to buy the item',
        'Any discount you did not receive',
        'Opportunity cost only applies to investments, not purchases',
      ],
      correctAnswer: 'S/200 in lost savings or other needs that could have been covered',
    },
    es: {
      text: 'Gastas S/200 en una compra impulsiva. En términos financieros, el "costo de oportunidad" de esta compra es:',
      options: [
        'S/200 en ahorro perdido u otras necesidades que podrían haberse cubierto',
        'El tiempo que tomó comprar el artículo',
        'Cualquier descuento que no recibiste',
        'El costo de oportunidad solo aplica a inversiones, no a compras',
      ],
      correctAnswer: 'S/200 en ahorro perdido u otras necesidades que podrían haberse cubierto',
    },
  },
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_delivery_apps',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Research shows Peruvian students consistently underestimate monthly spending on delivery apps (Rappi, PedidosYa). This is an example of:',
      options: [
        'Healthy discretionary spending',
        'Invisible expenses that erode the budget unnoticed',
        'A sound investment in convenience',
        'A need, not a want',
      ],
      correctAnswer: 'Invisible expenses that erode the budget unnoticed',
    },
    es: {
      text: 'Las investigaciones muestran que los estudiantes peruanos subestiman consistentemente el gasto mensual en apps de delivery (Rappi, PedidosYa). Esto es un ejemplo de:',
      options: [
        'Gasto discrecional saludable',
        'Gastos invisibles que erosionan el presupuesto sin ser notados',
        'Una inversión inteligente en comodidad',
        'Una necesidad, no un deseo',
      ],
      correctAnswer: 'Gastos invisibles que erosionan el presupuesto sin ser notados',
    },
  },
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_delay_gratification',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'Why does the 24-hour waiting rule reduce total spending, according to behavioral economics?',
      options: [
        'It gives time to find a lower price elsewhere',
        'Emotional urgency fades; rational evaluation reveals many impulse wants are not truly needed',
        'Most stores have a 24-hour return policy that discourages purchases',
        'It only works for online purchases, not in-store',
      ],
      correctAnswer: 'Emotional urgency fades; rational evaluation reveals many impulse wants are not truly needed',
    },
    es: {
      text: '¿Por qué la regla de espera de 24 horas reduce el gasto total, según la economía conductual?',
      options: [
        'Da tiempo para encontrar un precio más bajo en otro lugar',
        'La urgencia emocional se desvanece; la evaluación racional revela que muchos deseos impulsivos no son realmente necesarios',
        'La mayoría de las tiendas tiene política de devolución de 24 horas que desalienta las compras',
        'Solo funciona para compras en línea, no en tienda física',
      ],
      correctAnswer: 'La urgencia emocional se desvanece; la evaluación racional revela que muchos deseos impulsivos no son realmente necesarios',
    },
  },
  {
    topicTitle: 'Responsible Consumption',
    questionGroupKey: 'consume_40pct_wants_rebalance',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'A student tracks their spending and finds 40% goes to "wants" (vs. the 30% rule). What is the correct rebalancing action?',
      options: [
        'Increase income so 40% still covers needs',
        'Reduce wants spending from 40% to 30% and redirect the 10% to needs or savings',
        'The rule is flexible — 40% is acceptable if income is above average',
        'Cut both needs and wants by 5% each',
      ],
      correctAnswer: 'Reduce wants spending from 40% to 30% and redirect the 10% to needs or savings',
    },
    es: {
      text: 'Un estudiante rastrea sus gastos y descubre que el 40% va a "deseos" (vs. la regla del 30%). ¿Cuál es la acción correcta de reequilibrio?',
      options: [
        'Aumentar los ingresos para que el 40% cubra las necesidades',
        'Reducir el gasto en deseos del 40% al 30% y redirigir el 10% a necesidades o ahorro',
        'La regla es flexible: 40% es aceptable si el ingreso es superior a la media',
        'Reducir tanto las necesidades como los deseos en un 5% cada uno',
      ],
      correctAnswer: 'Reducir el gasto en deseos del 40% al 30% y redirigir el 10% a necesidades o ahorro',
    },
  },

  // ── Topic 8: Digital Wallets in Peru ────────────────────────────
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_yape_owner',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Yape, the most widely-used digital wallet in Peru, is owned by:',
      options: ['BBVA', 'Interbank', 'BCP (Banco de Crédito del Perú)', 'Scotiabank'],
      correctAnswer: 'BCP (Banco de Crédito del Perú)',
    },
    es: {
      text: 'Yape, la billetera digital más utilizada en Perú, es propiedad de:',
      options: ['BBVA', 'Interbank', 'BCP (Banco de Crédito del Perú)', 'Scotiabank'],
      correctAnswer: 'BCP (Banco de Crédito del Perú)',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_plin_consortium',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Plin digital wallet is operated by a consortium of banks. Which banks are part of it?',
      options: [
        'BCP and Scotiabank',
        'BBVA, Interbank, Scotiabank, and BanBif',
        'BBVA and BCP only',
        'All banks in Peru equally',
      ],
      correctAnswer: 'BBVA, Interbank, Scotiabank, and BanBif',
    },
    es: {
      text: 'La billetera digital Plin es operada por un consorcio de bancos. ¿Qué bancos lo integran?',
      options: [
        'BCP y Scotiabank',
        'BBVA, Interbank, Scotiabank y BanBif',
        'Solo BBVA y BCP',
        'Todos los bancos del Perú por igual',
      ],
      correctAnswer: 'BBVA, Interbank, Scotiabank y BanBif',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_tunki_fate',
    difficulty: TopicDifficulty.BEGINNER,
    en: {
      text: 'Tunki was originally Interbank\'s standalone digital wallet. What happened to it?',
      options: [
        'It merged with Yape',
        'It was phased out and replaced by Plin for Interbank customers',
        'It became the dominant wallet in Peru',
        'It was acquired by BCRP and made a national wallet',
      ],
      correctAnswer: 'It was phased out and replaced by Plin for Interbank customers',
    },
    es: {
      text: 'Tunki fue originalmente la billetera digital independiente de Interbank. ¿Qué pasó con ella?',
      options: [
        'Se fusionó con Yape',
        'Fue descontinuada y reemplazada por Plin para los clientes de Interbank',
        'Se convirtió en la billetera dominante en Perú',
        'Fue adquirida por el BCRP y convertida en billetera nacional',
      ],
      correctAnswer: 'Fue descontinuada y reemplazada por Plin para los clientes de Interbank',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_interoperability_2023',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Since 2023, Yape and Plin users can:',
      options: [
        'Only transfer money within the same platform',
        'Transfer money between the two platforms (full interoperability)',
        'Merge their accounts into a single wallet',
        'Access each other\'s bank accounts directly',
      ],
      correctAnswer: 'Transfer money between the two platforms (full interoperability)',
    },
    es: {
      text: 'Desde 2023, los usuarios de Yape y Plin pueden:',
      options: [
        'Transferir dinero solo dentro de la misma plataforma',
        'Transferir dinero entre ambas plataformas (interoperabilidad total)',
        'Fusionar sus cuentas en una sola billetera',
        'Acceder directamente a las cuentas bancarias del otro',
      ],
      correctAnswer: 'Transferir dinero entre ambas plataformas (interoperabilidad total)',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_yape_limit',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'What is the approximate daily transfer limit for basic Yape users in Peru?',
      options: ['S/500', 'S/1,000', 'S/2,000', 'S/10,000'],
      correctAnswer: 'S/2,000',
    },
    es: {
      text: '¿Cuál es el límite diario de transferencia aproximado para los usuarios básicos de Yape en Perú?',
      options: ['S/500', 'S/1,000', 'S/2,000', 'S/10,000'],
      correctAnswer: 'S/2,000',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_yape_prestamos',
    difficulty: TopicDifficulty.INTERMEDIATE,
    en: {
      text: 'Yape Préstamos allows users to access instant microloans up to approximately:',
      options: ['S/500', 'S/1,000', 'S/3,000', 'S/10,000'],
      correctAnswer: 'S/3,000',
    },
    es: {
      text: 'Yape Préstamos permite a los usuarios acceder a microcréditos instantáneos de hasta aproximadamente:',
      options: ['S/500', 'S/1,000', 'S/3,000', 'S/10,000'],
      correctAnswer: 'S/3,000',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_bcrp_mandated',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'Which institution mandated the interoperability between Yape and Plin in Peru?',
      options: ['SBS', 'BCRP', 'SMV', 'MEF'],
      correctAnswer: 'BCRP',
    },
    es: {
      text: '¿Qué institución ordenó la interoperabilidad entre Yape y Plin en Perú?',
      options: ['SBS', 'BCRP', 'SMV', 'MEF'],
      correctAnswer: 'BCRP',
    },
  },
  {
    topicTitle: 'Digital Wallets in Peru',
    questionGroupKey: 'wallet_sbs_supervision',
    difficulty: TopicDifficulty.ADVANCED,
    en: {
      text: 'Digital wallets like Yape and Plin are supervised by which regulator in Peru?',
      options: [
        'SMV, because they operate in financial markets',
        'SUNAT, because they handle taxable transactions',
        'SBS, as services offered by SBS-regulated banks',
        'INDECOPI, as consumer-facing services',
      ],
      correctAnswer: 'SBS, as services offered by SBS-regulated banks',
    },
    es: {
      text: '¿Qué regulador supervisa las billeteras digitales como Yape y Plin en Perú?',
      options: [
        'SMV, porque operan en mercados financieros',
        'SUNAT, porque manejan transacciones gravables',
        'SBS, como servicios ofrecidos por bancos regulados por la SBS',
        'INDECOPI, como servicios orientados al consumidor',
      ],
      correctAnswer: 'SBS, como servicios ofrecidos por bancos regulados por la SBS',
    },
  },
];

async function seedQuizQuestions(): Promise<void> {
  // Build a map of topic title → topic DB id
  const topics = await prisma.educationalTopic.findMany({ select: { id: true, title: true } });
  const topicByTitle = new Map(topics.map((t) => [t.title, t.id]));

  let created = 0;
  for (const entry of QUIZ_QUESTIONS) {
    const topicId = topicByTitle.get(entry.topicTitle) ?? null;

    for (const lang of ['en', 'es'] as const) {
      const q = entry[lang];
      const existing = await prisma.quizQuestion.findFirst({
        where: { questionGroupKey: entry.questionGroupKey, language: lang },
        select: { id: true },
      });

      if (!existing) {
        await prisma.quizQuestion.create({
          data: {
            topicId,
            questionGroupKey: entry.questionGroupKey,
            language: lang,
            difficulty: entry.difficulty,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
          },
        });
        created++;
      } else {
        await prisma.quizQuestion.update({
          where: { id: existing.id },
          data: {
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            difficulty: entry.difficulty,
          },
        });
      }
    }
  }
  console.log(`✓ Quiz questions seeded (${created} created, ${QUIZ_QUESTIONS.length * 2 - created} updated)`);
}

async function main(): Promise<void> {
  console.log('Seeding database...');
  await seedCategories();
  await seedChallenges();
  await seedBadges();
  await seedEducationalTopics();
  await seedSurveys();
  await seedQuizQuestions();
  await seedPilotUsers();
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
