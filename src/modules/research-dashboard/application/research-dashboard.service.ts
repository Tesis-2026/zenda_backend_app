import { BadRequestException, Injectable } from '@nestjs/common';
import { AiMessageRole, CategorySource, SurveyType, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { parseSurveyQuestions } from '../../surveys/domain/survey-question.types';
import {
  BehaviorChangeSummary,
  ClassificationAccuracySummary,
  CountShare,
  DailyResearchPoint,
  FavorableSummary,
  OpenAnswerSample,
  ResearchCohortSummary,
  ResearchDashboardData,
  ResearchDashboardQuery,
  ResearchPeriod,
  SatisfactionQuestionSummary,
  ScoreSummary,
} from './research-dashboard.types';

type DecimalLike = { toNumber(): number };

interface ParsedPeriod extends ResearchPeriod {
  fromDate?: Date;
  toDate?: Date;
}

interface DailyAccumulator {
  users: Set<string>;
  events: number;
  transactions: number;
  chatMessages: number;
}

interface CohortScope {
  cohort: ResearchCohortSummary | null;
  userIdFilter?: Prisma.StringFilter;
}

const COHORT_ENROLLMENT_EVENT = 'research_cohort_enrolled';
const BEHAVIOR_OBSERVATION_EVENT = 'research_behavior_observation';
const AI_CLASSIFICATION_EVALUATION_EVENT = 'research_ai_classification_evaluated';
const RESEARCH_ADMIN_EVENT_TYPES = [
  COHORT_ENROLLMENT_EVENT,
  BEHAVIOR_OBSERVATION_EVENT,
  AI_CLASSIFICATION_EVALUATION_EVENT,
];
const COHORT_ALIASES: Record<string, string> = {
  ILLUSTRATIVE_30: 'PILOT_2026_10_02',
};

@Injectable()
export class ResearchDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: ResearchDashboardQuery): Promise<ResearchDashboardData> {
    const scope = await this.resolveCohortScope(query.cohort);
    const period = this.parsePeriod({
      ...query,
      to: query.to ?? scope.cohort?.cutoffDate ?? undefined,
    });
    const createdAt = this.dateFilter(period);
    const userIdWhere = scope.userIdFilter ? { userId: scope.userIdFilter } : {};

    const [
      users,
      events,
      transactions,
      budgets,
      goals,
      accounts,
      conversations,
      aiMessages,
      feedbackMessages,
      surveyDefs,
      surveyResponses,
      qualitativeFeedback,
      behaviorObservations,
      classificationEvaluations,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          ...(scope.userIdFilter ? { id: scope.userIdFilter } : {}),
        },
        select: {
          id: true,
          age: true,
          university: true,
          incomeType: true,
          averageMonthlyIncome: true,
          financialLiteracyLevel: true,
          profileCompleted: true,
          consentGiven: true,
        },
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          ...userIdWhere,
          eventType: { notIn: RESEARCH_ADMIN_EVENT_TYPES },
          ...(createdAt ? { createdAt } : {}),
        },
        select: {
          userId: true,
          eventType: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          ...userIdWhere,
          deletedAt: null,
          ...(createdAt ? { occurredAt: createdAt } : {}),
        },
        select: {
          userId: true,
          type: true,
          amount: true,
          categorySource: true,
          budgetId: true,
          occurredAt: true,
        },
      }),
      this.prisma.budget.findMany({
        where: {
          ...userIdWhere,
          deletedAt: null,
          ...(createdAt ? { createdAt } : {}),
        },
        select: { userId: true },
      }),
      this.prisma.savingsGoal.findMany({
        where: {
          ...userIdWhere,
          deletedAt: null,
          ...(createdAt ? { createdAt } : {}),
        },
        select: { userId: true },
      }),
      this.prisma.account.findMany({
        where: { ...userIdWhere, deletedAt: null },
        select: { userId: true, type: true },
      }),
      this.prisma.aiConversation.findMany({
        where: { ...userIdWhere, ...(createdAt ? { createdAt } : {}) },
        select: { userId: true, createdAt: true },
      }),
      this.prisma.aiMessage.findMany({
        where: {
          ...(scope.userIdFilter
            ? {
                conversation: {
                  is: { userId: scope.userIdFilter },
                },
              }
            : {}),
          ...(createdAt ? { createdAt } : {}),
        },
        select: {
          role: true,
          content: true,
          createdAt: true,
          conversation: { select: { userId: true } },
        },
      }),
      this.prisma.aiMessage.findMany({
        where: {
          role: AiMessageRole.ASSISTANT,
          ...(scope.userIdFilter
            ? {
                conversation: {
                  is: { userId: scope.userIdFilter },
                },
              }
            : {}),
          feedbackAt: this.nullableDateFilter(createdAt),
        },
        select: {
          feedbackRating: true,
          feedbackHelpful: true,
          feedbackClear: true,
          feedbackPersonalized: true,
          feedbackComment: true,
          feedbackAt: true,
          conversation: { select: { userId: true } },
        },
      }),
      this.prisma.survey.findMany({
        select: { type: true, questionsJson: true },
      }),
      this.prisma.surveyResponse.findMany({
        where: {
          ...userIdWhere,
          ...(createdAt ? { completedAt: createdAt } : {}),
        },
        select: {
          userId: true,
          answersJson: true,
          score: true,
          completedAt: true,
          survey: { select: { type: true } },
        },
      }),
      this.prisma.feedback.findMany({
        where: {
          ...userIdWhere,
          ...(createdAt ? { createdAt } : {}),
        },
        select: { userId: true, rating: true, message: true },
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          ...userIdWhere,
          eventType: BEHAVIOR_OBSERVATION_EVENT,
          ...(createdAt ? { createdAt } : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: { userId: true, metadata: true },
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          ...userIdWhere,
          eventType: AI_CLASSIFICATION_EVALUATION_EVENT,
          ...(createdAt ? { createdAt } : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: { metadata: true },
      }),
    ]);

    const activeUserIds = new Set<string>();
    const daily = new Map<string, DailyAccumulator>();

    for (const event of events) {
      activeUserIds.add(event.userId);
      this.addDaily(daily, event.createdAt, event.userId, 'event');
    }
    for (const transaction of transactions) {
      activeUserIds.add(transaction.userId);
      this.addDaily(daily, transaction.occurredAt, transaction.userId, 'transaction');
    }
    for (const conversation of conversations) {
      activeUserIds.add(conversation.userId);
      this.addDaily(daily, conversation.createdAt, conversation.userId, 'event');
    }
    for (const message of aiMessages) {
      activeUserIds.add(message.conversation.userId);
      this.addDaily(daily, message.createdAt, message.conversation.userId, 'chat');
    }
    for (const response of surveyResponses) {
      activeUserIds.add(response.userId);
      this.addDaily(daily, response.completedAt, response.userId, 'event');
    }
    for (const feedback of qualitativeFeedback) {
      activeUserIds.add(feedback.userId);
    }
    for (const feedback of feedbackMessages) {
      activeUserIds.add(feedback.conversation.userId);
    }

    const dailySeries = this.toDailySeries(daily);
    const surveyData = this.buildSurveyData(surveyDefs, surveyResponses);
    const assistantMessages = aiMessages.filter(
      (message) => message.role === AiMessageRole.ASSISTANT,
    );
    const assistantWordCounts = assistantMessages.map((message) =>
      this.countWords(message.content),
    );
    const feedbackRatings = feedbackMessages
      .map((message) => message.feedbackRating)
      .filter((rating): rating is number => typeof rating === 'number');
    const helpfulValues = feedbackMessages
      .map((message) => message.feedbackHelpful)
      .filter((value): value is boolean => typeof value === 'boolean');
    const clearValues = feedbackMessages
      .map((message) => message.feedbackClear)
      .filter((value): value is boolean => typeof value === 'boolean');
    const personalizedValues = feedbackMessages
      .map((message) => message.feedbackPersonalized)
      .filter((value): value is boolean => typeof value === 'boolean');
    const qualitativeRatings = qualitativeFeedback
      .map((feedback) => feedback.rating)
      .filter((rating): rating is number => typeof rating === 'number');

    const incomeTransactions = transactions.filter(
      (transaction) => transaction.type === TransactionType.INCOME,
    );
    const expenseTransactions = transactions.filter(
      (transaction) => transaction.type === TransactionType.EXPENSE,
    );
    const transferTransactions = transactions.filter(
      (transaction) => transaction.type === TransactionType.TRANSFER,
    );
    const aiCategorizedTransactions = transactions.filter(
      (transaction) => transaction.categorySource !== CategorySource.USER,
    ).length;
    const budgetLinkedTransactions = transactions.filter(
      (transaction) => transaction.budgetId !== null,
    ).length;
    const behavior = this.buildBehaviorData(behaviorObservations);
    const classificationAccuracy = this.buildClassificationAccuracy(classificationEvaluations);

    return {
      generatedAt: new Date().toISOString(),
      cohort: scope.cohort,
      period: {
        from: period.from,
        to: period.to,
        label: period.label,
      },
      participants: {
        totalUsers: users.length,
        activeUsers: activeUserIds.size,
        profileCompleted: users.filter((user) => user.profileCompleted).length,
        consentGiven: users.filter((user) => user.consentGiven).length,
        averageAge: this.average(
          users.map((user) => user.age).filter((age): age is number => typeof age === 'number'),
        ),
        averageMonthlyIncome: this.average(
          users
            .map((user) => this.decimalToNumber(user.averageMonthlyIncome))
            .filter((amount): amount is number => amount !== null),
        ),
        universities: this.countShares(
          users.map((user) => user.university?.trim() || 'No registrado'),
          users.length,
          8,
        ),
        incomeTypes: this.countShares(
          users.map((user) => user.incomeType ?? 'No registrado'),
          users.length,
        ),
        literacyLevels: this.countShares(
          users.map((user) => user.financialLiteracyLevel ?? 'No registrado'),
          users.length,
        ),
      },
      usage: {
        totalEvents: events.length,
        sessions: events.filter((event) => event.eventType === 'app_session_started').length,
        dailyActiveUsersAverage: this.average(dailySeries.map((point) => point.activeUsers)) ?? 0,
        eventsByType: this.countShares(
          events.map((event) => event.eventType),
          events.length,
          12,
        ),
        daily: dailySeries,
        betaBuilds: this.countShares(
          events.map((event) => this.betaBuildLabel(event.metadata)),
          events.length,
          8,
        ),
      },
      finance: {
        transactions: transactions.length,
        usersWithTransactions: new Set(transactions.map((transaction) => transaction.userId)).size,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
        transferCount: transferTransactions.length,
        totalIncome: this.sumMoney(incomeTransactions.map((item) => item.amount)),
        totalExpense: this.sumMoney(expenseTransactions.map((item) => item.amount)),
        totalTransfer: this.sumMoney(transferTransactions.map((item) => item.amount)),
        budgets: budgets.length,
        usersWithBudgets: new Set(budgets.map((budget) => budget.userId)).size,
        goals: goals.length,
        usersWithGoals: new Set(goals.map((goal) => goal.userId)).size,
        accounts: accounts.length,
        accountTypes: this.countShares(
          accounts.map((account) => account.type),
          accounts.length,
        ),
        aiCategorizedTransactions,
        aiCategoryShare: this.percentage(aiCategorizedTransactions, transactions.length),
        budgetLinkedTransactions,
        budgetLinkedShare: this.percentage(budgetLinkedTransactions, transactions.length),
        habitualExpenseTracking: behavior.habitualExpenseTracking,
        expensePlanning: behavior.expensePlanning,
      },
      ai: {
        conversations: conversations.length,
        usersWithConversations: new Set(conversations.map((conversation) => conversation.userId))
          .size,
        userMessages: aiMessages.filter((message) => message.role === AiMessageRole.USER).length,
        assistantMessages: assistantMessages.length,
        averageAssistantWords: this.average(assistantWordCounts),
        feedbackCount: feedbackMessages.length,
        averageRating: this.average(feedbackRatings),
        helpfulRate: this.booleanRate(helpfulValues),
        clearRate: this.booleanRate(clearValues),
        personalizedRate: this.booleanRate(personalizedValues),
        classificationAccuracy,
        comments: feedbackMessages
          .map((message) => message.feedbackComment?.trim() ?? '')
          .filter((comment) => comment.length > 0)
          .slice(0, 12)
          .map((comment) => this.truncate(comment, 180)),
      },
      surveys: surveyData,
      qualitativeFeedback: {
        total: qualitativeFeedback.length,
        averageRating: this.average(qualitativeRatings),
        samples: qualitativeFeedback
          .map((feedback) => feedback.message.trim())
          .filter((message) => message.length > 0)
          .slice(0, 12)
          .map((message) => this.truncate(message, 180)),
      },
    };
  }

  private buildSurveyData(
    surveys: Array<{ type: SurveyType; questionsJson: Prisma.JsonValue }>,
    responses: Array<{
      userId: string;
      answersJson: Prisma.JsonValue;
      score: DecimalLike | null;
      survey: { type: SurveyType };
    }>,
  ): ResearchDashboardData['surveys'] {
    const byType = new Map<SurveyType, typeof responses>();
    for (const type of Object.values(SurveyType)) {
      byType.set(type, []);
    }
    for (const response of responses) {
      byType.get(response.survey.type)?.push(response);
    }

    const pre = byType.get(SurveyType.PRE) ?? [];
    const post = byType.get(SurveyType.POST) ?? [];
    const preByUser = new Map(
      pre
        .map((response) => [response.userId, this.decimalToNumber(response.score)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] !== null),
    );
    const postByUser = new Map(
      post
        .map((response) => [response.userId, this.decimalToNumber(response.score)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] !== null),
    );
    const deltas: number[] = [];
    const deltaPercentages: number[] = [];
    for (const [userId, preScore] of preByUser.entries()) {
      const postScore = postByUser.get(userId);
      if (typeof postScore !== 'number') continue;
      deltas.push(this.round(postScore - preScore, 2));
      if (preScore > 0) {
        deltaPercentages.push(this.round(((postScore - preScore) / preScore) * 100, 2));
      }
    }

    const satisfactionDef = surveys.find((survey) => survey.type === SurveyType.SATISFACTION);
    const satisfactionQuestions = satisfactionDef
      ? parseSurveyQuestions(satisfactionDef.questionsJson)
      : [];
    const satisfactionResponses = byType.get(SurveyType.SATISFACTION) ?? [];
    const utilityQuestionId =
      satisfactionQuestions.find((question) => question.order === 3)?.id ?? 'satisfaction-003';
    const continuationQuestionId =
      satisfactionQuestions.find((question) => question.order === 6)?.id ?? 'satisfaction-006';

    return {
      pre: this.scoreSummary(pre),
      post: this.scoreSummary(post),
      sus: this.scoreSummary(byType.get(SurveyType.SUS) ?? []),
      satisfaction: this.scoreSummary(satisfactionResponses),
      pairedPrePostUsers: deltas.length,
      averagePrePostDelta: this.average(deltas),
      averagePrePostDeltaPercentage: this.average(deltaPercentages),
      utilityFavorable: this.favorableSummary(satisfactionResponses, utilityQuestionId),
      continuationIntent: this.favorableSummary(satisfactionResponses, continuationQuestionId),
      satisfactionLikert: satisfactionQuestions
        .filter((question) => question.options.length > 0)
        .map<SatisfactionQuestionSummary>((question) => {
          const values = satisfactionResponses
            .map((response) => {
              const answers = this.asStringRecord(response.answersJson);
              const value = Number(answers[question.id]);
              return Number.isFinite(value) ? value : null;
            })
            .filter((value): value is number => value !== null);
          return {
            order: question.order,
            text: question.text,
            average: this.average(values),
            responses: values.length,
          };
        }),
      openAnswers: this.openAnswerSamples(
        satisfactionQuestions
          .filter((question) => question.options.length === 0)
          .map((question) => ({ id: question.id, text: question.text })),
        satisfactionResponses,
      ),
    };
  }

  private async resolveCohortScope(requestedCode?: string): Promise<CohortScope> {
    const enrollmentEvents = await this.prisma.analyticsEvent.findMany({
      where: { eventType: COHORT_ENROLLMENT_EVENT },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, metadata: true },
    });
    const enrollments = enrollmentEvents
      .map((event) => {
        const metadata = this.asRecord(event.metadata);
        const code = typeof metadata.code === 'string' ? metadata.code : null;
        if (!code) return null;
        return {
          userId: event.userId,
          code,
          label: typeof metadata.label === 'string' ? metadata.label : code,
          cutoffDate: typeof metadata.cutoffDate === 'string' ? metadata.cutoffDate : null,
          excludedFromDefault:
            metadata.excludedFromDefault === true || metadata.synthetic === true,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (requestedCode) {
      const selectedCode = COHORT_ALIASES[requestedCode] ?? requestedCode;
      const selected = enrollments.filter((item) => item.code === selectedCode);
      if (selected.length === 0) {
        throw new BadRequestException(`Unknown research cohort: ${requestedCode}`);
      }
      const first = selected[0];
      return {
        cohort: {
          code: first.code,
          label: first.label,
          cutoffDate: first.cutoffDate,
        },
        userIdFilter: { in: Array.from(new Set(selected.map((item) => item.userId))) },
      };
    }

    const excludedUserIds = Array.from(
      new Set(enrollments.filter((item) => item.excludedFromDefault).map((item) => item.userId)),
    );
    return {
      cohort: null,
      userIdFilter: excludedUserIds.length > 0 ? { notIn: excludedUserIds } : undefined,
    };
  }

  private buildBehaviorData(observations: Array<{ userId: string; metadata: Prisma.JsonValue }>): {
    habitualExpenseTracking: BehaviorChangeSummary;
    expensePlanning: BehaviorChangeSummary;
  } {
    const latest = new Map<
      string,
      {
        userId: string;
        phase: 'PRE' | 'POST';
        habitualExpenseTracking: boolean;
        expensePlanning: boolean;
      }
    >();
    for (const observation of observations) {
      const metadata = this.asRecord(observation.metadata);
      const phase = metadata.phase;
      if (phase !== 'PRE' && phase !== 'POST') continue;
      latest.set(`${observation.userId}:${phase}`, {
        userId: observation.userId,
        phase,
        habitualExpenseTracking: metadata.habitualExpenseTracking === true,
        expensePlanning: metadata.expensePlanning === true,
      });
    }
    const values = Array.from(latest.values());
    return {
      habitualExpenseTracking: this.behaviorChangeSummary(values, 'habitualExpenseTracking'),
      expensePlanning: this.behaviorChangeSummary(values, 'expensePlanning'),
    };
  }

  private behaviorChangeSummary(
    observations: Array<{
      phase: 'PRE' | 'POST';
      habitualExpenseTracking: boolean;
      expensePlanning: boolean;
    }>,
    field: 'habitualExpenseTracking' | 'expensePlanning',
  ): BehaviorChangeSummary {
    const preObservations = observations.filter((item) => item.phase === 'PRE');
    const postObservations = observations.filter((item) => item.phase === 'POST');
    const pre = preObservations.filter((item) => item[field]).length;
    const post = postObservations.filter((item) => item[field]).length;
    const total = Math.max(preObservations.length, postObservations.length);
    const prePercentage =
      preObservations.length > 0 ? this.percentage(pre, preObservations.length) : null;
    const postPercentage =
      postObservations.length > 0 ? this.percentage(post, postObservations.length) : null;
    return {
      pre,
      post,
      total,
      prePercentage,
      postPercentage,
      deltaPercentagePoints:
        prePercentage !== null && postPercentage !== null
          ? this.round(postPercentage - prePercentage, 1)
          : null,
    };
  }

  private buildClassificationAccuracy(
    evaluations: Array<{ metadata: Prisma.JsonValue }>,
  ): ClassificationAccuracySummary {
    const latest = new Map<string, boolean>();
    for (const evaluation of evaluations) {
      const metadata = this.asRecord(evaluation.metadata);
      const caseId =
        typeof metadata.caseId === 'string'
          ? metadata.caseId
          : typeof metadata.transactionId === 'string'
            ? metadata.transactionId
            : null;
      if (!caseId || typeof metadata.isCorrect !== 'boolean') continue;
      latest.set(caseId, metadata.isCorrect);
    }
    const values = Array.from(latest.values());
    const correct = values.filter(Boolean).length;
    return {
      correct,
      total: values.length,
      percentage: values.length > 0 ? this.percentage(correct, values.length) : null,
    };
  }

  private favorableSummary(
    responses: Array<{ answersJson: Prisma.JsonValue }>,
    questionId: string,
  ): FavorableSummary {
    const values = responses
      .map((response) => Number(this.asStringRecord(response.answersJson)[questionId]))
      .filter((value) => Number.isFinite(value));
    const favorable = values.filter((value) => value >= 4).length;
    return {
      favorable,
      total: values.length,
      percentage: values.length > 0 ? this.percentage(favorable, values.length) : null,
    };
  }

  private openAnswerSamples(
    questions: Array<{ id: string; text: string }>,
    responses: Array<{ answersJson: Prisma.JsonValue }>,
  ): OpenAnswerSample[] {
    const samples: OpenAnswerSample[] = [];
    for (const response of responses) {
      const answers = this.asStringRecord(response.answersJson);
      for (const question of questions) {
        const answer = answers[question.id]?.trim();
        if (!answer) continue;
        samples.push({
          question: question.text,
          answer: this.truncate(answer, 180),
        });
        if (samples.length >= 24) return samples;
      }
    }
    return samples;
  }

  private scoreSummary(responses: Array<{ score: DecimalLike | null }>): ScoreSummary {
    return {
      completed: responses.length,
      averageScore: this.average(
        responses
          .map((response) => this.decimalToNumber(response.score))
          .filter((score): score is number => score !== null),
      ),
    };
  }

  private parsePeriod(query: ResearchDashboardQuery): ParsedPeriod {
    const fromDate = query.from ? this.parseDate(query.from, 'from', false) : undefined;
    const toDate = query.to ? this.parseDate(query.to, 'to', true) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('from must be before or equal to to');
    }

    const from = fromDate ? this.formatDate(fromDate) : null;
    const to = toDate ? this.formatDate(toDate) : null;
    const label =
      from && to
        ? `${from} a ${to}`
        : from
          ? `Desde ${from}`
          : to
            ? `Hasta ${to}`
            : 'Todo el piloto';

    return { from, to, label, fromDate, toDate };
  }

  private parseDate(value: string, field: string, endOfDay: boolean): Date {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    return date;
  }

  private dateFilter(period: ParsedPeriod): Prisma.DateTimeFilter | undefined {
    if (!period.fromDate && !period.toDate) return undefined;
    return {
      ...(period.fromDate ? { gte: period.fromDate } : {}),
      ...(period.toDate ? { lte: period.toDate } : {}),
    };
  }

  private nullableDateFilter(filter?: Prisma.DateTimeFilter): Prisma.DateTimeNullableFilter {
    return { not: null, ...(filter ?? {}) };
  }

  private addDaily(
    daily: Map<string, DailyAccumulator>,
    date: Date,
    userId: string,
    kind: 'event' | 'transaction' | 'chat',
  ): void {
    const key = this.formatDate(date);
    const point =
      daily.get(key) ??
      ({
        users: new Set<string>(),
        events: 0,
        transactions: 0,
        chatMessages: 0,
      } satisfies DailyAccumulator);
    point.users.add(userId);
    if (kind === 'event') point.events += 1;
    if (kind === 'transaction') point.transactions += 1;
    if (kind === 'chat') point.chatMessages += 1;
    daily.set(key, point);
  }

  private toDailySeries(daily: Map<string, DailyAccumulator>): DailyResearchPoint[] {
    return Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        activeUsers: value.users.size,
        events: value.events,
        transactions: value.transactions,
        chatMessages: value.chatMessages,
      }));
  }

  private countShares(
    values: Array<string | null | undefined>,
    denominator = values.length,
    limit = 10,
  ): CountShare[] {
    const counts = new Map<string, number>();
    for (const raw of values) {
      const label = raw?.trim() || 'No registrado';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([label, count]) => ({
        label,
        count,
        percentage: this.percentage(count, denominator),
      }));
  }

  private betaBuildLabel(metadata: Prisma.JsonValue): string {
    const record = this.asRecord(metadata);
    const appVersion = this.pickMetadata(record, ['appVersion', 'app_version', 'version']);
    const buildNumber = this.pickMetadata(record, ['buildNumber', 'build_number', 'build']);
    const betaId = this.pickMetadata(record, [
      'betaDistributionId',
      'beta_distribution_id',
      'releaseId',
      'release_id',
    ]);

    if (!appVersion && !buildNumber && !betaId) return 'Sin metadata beta';
    return [
      appVersion ? `v${appVersion}` : null,
      buildNumber ? `build ${buildNumber}` : null,
      betaId ? `beta ${betaId}` : null,
    ]
      .filter((part): part is string => part !== null)
      .join(' / ');
  }

  private pickMetadata(record: Record<string, Prisma.JsonValue>, keys: string[]): string | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
    return null;
  }

  private asRecord(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, Prisma.JsonValue>)
      : {};
  }

  private asStringRecord(value: Prisma.JsonValue): Record<string, string> {
    const record = this.asRecord(value);
    return Object.fromEntries(
      Object.entries(record)
        .filter((entry): entry is [string, string | number | boolean] =>
          ['string', 'number', 'boolean'].includes(typeof entry[1]),
        )
        .map(([key, raw]) => [key, String(raw)]),
    );
  }

  private sumMoney(values: DecimalLike[]): number {
    return this.round(
      values.reduce((sum, value) => sum + value.toNumber(), 0),
      2,
    );
  }

  private decimalToNumber(value?: DecimalLike | null): number | null {
    return value ? value.toNumber() : null;
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return this.round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
  }

  private booleanRate(values: boolean[]): number | null {
    if (values.length === 0) return null;
    return this.percentage(values.filter((value) => value).length, values.length);
  }

  private percentage(part: number, total: number): number {
    if (total <= 0) return 0;
    return this.round((part / total) * 100, 1);
  }

  private round(value: number, digits: number): number {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private truncate(text: string, maxLength: number): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 3)}...`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
