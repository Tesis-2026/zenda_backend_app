import { Inject, Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiProvider, SpendingContext } from '../../../../infra/ai/AiProvider';
import { AI_PROVIDER } from '../../../../infra/ai/ai.module';
import { AnalyticsService } from '../../../../infra/analytics/analytics.service';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { IPersonalizedQuizContextPort } from '../../domain/ports/personalized-quiz-context.port';
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
    private readonly context: IPersonalizedQuizContextPort,
  ) {}

  async execute(cmd: GetPersonalizedQuizCommand): Promise<PersonalizedQuizResult> {
    const lang = cmd.language === 'es' ? 'es' : 'en';

    const attemptsToday =
      await this.context.countQuizPersonalizedAttemptsToday(cmd.userId);
    if (attemptsToday >= DAILY_LIMIT) {
      throw new HttpException(
        {
          message: 'Has alcanzado el límite de 5 quizzes personalizados por día',
          attemptsRemainingToday: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const spendingContext = await this.buildSpendingContext(cmd.userId);
    const result = await this.ai.generatePersonalizedQuiz(spendingContext, lang);

    if (result.questions.length === 0) {
      throw new HttpException(
        'No se pudo generar el quiz personalizado',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
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

  private async buildSpendingContext(userId: string): Promise<SpendingContext> {
    const [profile, months] = await Promise.all([
      this.context.getUserProfile(userId),
      this.context.listSpendingByMonth(userId, 3),
    ]);

    return {
      userId,
      userProfile: {
        financialLiteracyLevel: profile?.financialLiteracyLevel ?? null,
        age: profile?.age ?? null,
        university: profile?.university ?? null,
        incomeType: profile?.incomeType ?? null,
        averageMonthlyIncome: profile?.averageMonthlyIncome ?? null,
      },
      months,
    };
  }
}
