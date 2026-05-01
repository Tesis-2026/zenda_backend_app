import { Inject, Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AiProvider, SpendingContext } from '../../../../infra/ai/AiProvider';
import { AI_PROVIDER } from '../../../../infra/ai/ai.module';
import { AnalyticsService } from '../../../../infra/analytics/analytics.service';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { QuizQuestion } from './get-quiz.use-case';

const DAILY_LIMIT = 5;

export interface GetPersonalizedQuizCommand {
  userId: string;
  language: string;
}

export interface PersonalizedQuizResult {
  questions: QuizQuestion[];
  attemptsRemainingToday: number;
}

@Injectable()
export class GetPersonalizedQuizUseCase {
  constructor(
    private readonly repo: IEducationRepository,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(cmd: GetPersonalizedQuizCommand): Promise<PersonalizedQuizResult> {
    const lang = cmd.language === 'es' ? 'es' : 'en';

    const attemptsToday = await this.countAttemptsToday(cmd.userId);
    if (attemptsToday >= DAILY_LIMIT) {
      throw new HttpException(
        { message: 'Has alcanzado el límite de 5 quizzes personalizados por día', attemptsRemainingToday: 0 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const context = await this.buildSpendingContext(cmd.userId);
    const result = await this.ai.generatePersonalizedQuiz(context, lang);

    if (result.questions.length === 0) {
      throw new HttpException('No se pudo generar el quiz personalizado', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const savedQuestions = await this.repo.savePersonalizedQuestions(result.questions, lang);

    this.analytics.track(cmd.userId, 'quiz_personalized', { language: lang });

    return {
      questions: savedQuestions.map((q) => ({
        id: q.id,
        difficulty: q.difficulty,
        text: q.text,
        options: q.options,
      })),
      attemptsRemainingToday: DAILY_LIMIT - attemptsToday - 1,
    };
  }

  private async countAttemptsToday(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.prisma.analyticsEvent.count({
      where: { userId, eventType: 'quiz_personalized', createdAt: { gte: startOfDay } },
    });
  }

  private async buildSpendingContext(userId: string): Promise<SpendingContext> {
    const now = new Date();
    const months: SpendingContext['months'] = [];

    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [incomeAgg, expenseAgg, byCategory] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { userId, type: TransactionType.INCOME, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const catIds = byCategory.map((r) => r.categoryId).filter((id): id is string => id !== null);
      const cats = catIds.length
        ? await this.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
        : [];
      const catMap = new Map(cats.map((c) => [c.id, c.name]));

      months.push({
        period,
        totalIncome: (incomeAgg._sum.amount ?? new Decimal(0)).toNumber(),
        totalExpenses: (expenseAgg._sum.amount ?? new Decimal(0)).toNumber(),
        categories: byCategory.map((r) => ({
          categoryId: r.categoryId ?? 'unknown',
          categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? 'Unknown') : 'Unknown',
          totalAmount: (r._sum.amount ?? new Decimal(0)).toNumber(),
          transactionCount: r._count.id,
        })),
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { financialLiteracyLevel: true, age: true, university: true, incomeType: true, averageMonthlyIncome: true },
    });

    return {
      userId,
      userProfile: {
        financialLiteracyLevel: (user?.financialLiteracyLevel as SpendingContext['userProfile']['financialLiteracyLevel']) ?? null,
        age: user?.age ?? null,
        university: user?.university ?? null,
        incomeType: user?.incomeType ?? null,
        averageMonthlyIncome: user?.averageMonthlyIncome?.toNumber() ?? null,
      },
      months,
    };
  }
}
