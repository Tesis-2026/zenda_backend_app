import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SpendingContext } from '../../../../infra/ai/AiProvider';
import { AzureFoundryAgentClient } from '../../../../infra/ai/azure-foundry-agent.client';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { PersonalizedQuestionInput } from '../../domain/ports/education.repository';
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
  private readonly logger = new Logger(GetPersonalizedQuizUseCase.name);

  constructor(
    private readonly repo: IEducationRepository,
    private readonly ragAgent: AzureFoundryAgentClient,
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
    const questions = await this.generateQuestionsWithAgent(spendingContext, lang);

    if (questions.length === 0) {
      throw new HttpException(
        'No se pudo generar el quiz personalizado',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const savedQuestions = await this.repo.savePersonalizedQuestions(questions, lang);

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

  private async generateQuestionsWithAgent(
    context: SpendingContext,
    language: string,
  ): Promise<PersonalizedQuestionInput[]> {
    try {
      const response = await this.ragAgent.ask({
        financialContext: this.buildAgentFinancialContext(context),
        taskInstructions: this.buildQuizSystemPrompt(language),
        message: this.buildQuizUserPrompt(language),
      });
      const questions = this.parseAgentQuestions(response.answer).slice(0, 5);

      this.logger.log(
        JSON.stringify({
          userId: context.userId,
          generatedQuestions: questions.length,
          usedRag: response.metadata.usedRag,
          mode: response.metadata.mode,
          sourcesCount: response.sources.length,
        }),
      );

      return questions;
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          userId: context.userId,
          errorName: err instanceof Error ? err.name : 'UnknownError',
        }),
        err instanceof Error ? err.stack : undefined,
      );
      throw new HttpException(
        'No se pudo generar el quiz personalizado',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
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

  private buildQuizSystemPrompt(language: string): string {
    const languageLabel = language === 'es' ? 'espanol peruano claro' : 'English';
    return [
      'Actua como el generador de quizzes de educacion financiera de Zenda.',
      'Usa el agente ZENDA, su base documental RAG y el contexto financiero agregado del usuario.',
      `Genera exactamente 5 preguntas de opcion multiple en ${languageLabel}.`,
      'Personaliza las preguntas segun perfil, ingreso, gastos, categorias frecuentes y nivel de educacion financiera.',
      'Distribucion obligatoria de dificultad: 2 BEGINNER, 2 INTERMEDIATE y 1 ADVANCED.',
      'Cada pregunta debe tener exactamente 4 alternativas.',
      'correctAnswer debe ser exactamente igual a uno de los strings de options.',
      'Evita pedir datos sensibles. Evita recomendaciones de inversion especifica, trading o enriquecimiento rapido.',
      'No respondas en prosa. No uses markdown. No agregues citas visibles.',
      'Responde solo JSON valido con este schema:',
      '{"questions":[{"text":"pregunta","options":["A) opcion","B) opcion","C) opcion","D) opcion"],"correctAnswer":"A) opcion","difficulty":"BEGINNER"}]}',
    ].join('\n');
  }

  private buildQuizUserPrompt(language: string): string {
    const languageLabel = language === 'es' ? 'espanol' : 'English';
    return [
      `Genera un quiz personalizado de educacion financiera en ${languageLabel}.`,
      'Las preguntas deben evaluar comprension practica, no memoria literal.',
      'Usa ejemplos realistas para estudiantes universitarios peruanos cuando sea apropiado.',
    ].join('\n');
  }

  private buildAgentFinancialContext(context: SpendingContext): string {
    const profile = context.userProfile;
    const months = context.months.length
      ? context.months
          .map((month) => {
            const categories = month.categories.length
              ? month.categories
                  .slice(0, 5)
                  .map(
                    (category) =>
                      `${this.safeText(category.categoryName)}: S/${this.formatNumber(category.totalAmount)} (${category.transactionCount} mov.)`,
                  )
                  .join('; ')
              : 'Sin categorias registradas';
            return `- ${month.period}: ingresos S/${this.formatNumber(month.totalIncome)}, gastos S/${this.formatNumber(month.totalExpenses)}, categorias: ${categories}`;
          })
          .join('\n')
      : '- Sin historial reciente de ingresos o gastos.';

    return [
      'Contexto financiero agregado para generar quiz personalizado:',
      `- Nivel de educacion financiera: ${profile.financialLiteracyLevel ?? 'No registrado'}`,
      `- Edad: ${profile.age ?? 'No registrada'}`,
      `- Universidad: ${profile.university ? this.safeText(profile.university) : 'No registrada'}`,
      `- Tipo de ingreso: ${profile.incomeType ?? 'No registrado'}`,
      `- Ingreso mensual promedio declarado: ${
        profile.averageMonthlyIncome !== null
          ? `S/${this.formatNumber(profile.averageMonthlyIncome)}`
          : 'No registrado'
      }`,
      'Meses recientes:',
      months,
    ].join('\n');
  }

  private parseAgentQuestions(rawAnswer: string): PersonalizedQuestionInput[] {
    const jsonText = this.extractJsonObject(rawAnswer);
    const parsed = JSON.parse(jsonText) as unknown;

    if (!this.isRecord(parsed) || !Array.isArray(parsed.questions)) {
      throw new Error('Agent response did not include a questions array');
    }

    const questions = parsed.questions.flatMap((item) => {
      try {
        return [this.toQuestionInput(item)];
      } catch {
        return [];
      }
    });

    if (questions.length === 0) {
      throw new Error('Agent response did not include valid questions');
    }

    return questions;
  }

  private extractJsonObject(rawAnswer: string): string {
    const trimmed = rawAnswer.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() ?? trimmed;

    if (candidate.startsWith('{') && candidate.endsWith('}')) {
      return candidate;
    }

    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return candidate.slice(start, end + 1);
    }

    throw new Error('Agent response did not contain JSON');
  }

  private toQuestionInput(value: unknown): PersonalizedQuestionInput {
    if (!this.isRecord(value)) {
      throw new Error('Question is not an object');
    }

    const text = this.nonEmptyString(value.text);
    const options = Array.isArray(value.options)
      ? value.options
          .map((option) => this.nonEmptyString(option))
          .filter((option): option is string => option !== null)
      : [];
    const difficulty = this.normalizeDifficulty(value.difficulty);
    const correctAnswer = this.normalizeCorrectAnswer(value.correctAnswer, options);

    if (!text || options.length !== 4 || !difficulty || !correctAnswer) {
      throw new Error('Question is incomplete');
    }

    return {
      text,
      options,
      correctAnswer,
      difficulty,
    };
  }

  private normalizeDifficulty(value: unknown): PersonalizedQuestionInput['difficulty'] | null {
    const raw = this.nonEmptyString(value)?.toUpperCase();
    if (raw === 'BEGINNER' || raw === 'INTERMEDIATE' || raw === 'ADVANCED') {
      return raw;
    }
    return null;
  }

  private normalizeCorrectAnswer(value: unknown, options: string[]): string | null {
    const raw = this.nonEmptyString(value);
    if (!raw) return null;
    if (options.includes(raw)) return raw;

    const letter = raw.match(/^([A-D])(?:[\).:]|\s|$)/i)?.[1];
    if (letter) {
      const index = letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      return options[index] ?? null;
    }

    const strippedRaw = this.stripOptionPrefix(raw).toLowerCase();
    return (
      options.find((option) => this.stripOptionPrefix(option).toLowerCase() === strippedRaw) ??
      null
    );
  }

  private stripOptionPrefix(value: string): string {
    return value.replace(/^[A-D][\).:]\s*/i, '').trim();
  }

  private nonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private formatNumber(value: number): string {
    return value.toFixed(2);
  }

  private safeText(value: string): string {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redactado]')
      .replace(/\b(?:\d[\s-]?){8,}\b/g, '[numero]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
