import { Injectable, Logger } from '@nestjs/common';
import { SpendingContext } from '../../../../infra/ai/AiProvider';
import { AzureFoundryAgentClient } from '../../../../infra/ai/azure-foundry-agent.client';
import { EducationTopicEntity, TopicDifficulty } from '../../domain/education-topic.entity';
import { IEducationRepository } from '../../domain/ports/education.repository';
import { IPersonalizedQuizContextPort } from '../../domain/ports/personalized-quiz-context.port';

export type LearningPathSource = 'agent' | 'fallback';
export type LearningPathStepKind = 'topic' | 'personalized_quiz';
export type LearningPathQuizMode = 'app_topic_quiz' | 'ai_personalized_quiz';
export type LearningPathStepStatus = 'pending' | 'read' | 'completed';

export interface GetPersonalizedLearningPathCommand {
  userId: string;
  language: string;
}

export interface PersonalizedLearningPathStep {
  id: string;
  kind: LearningPathStepKind;
  topicId: string | null;
  title: string;
  reason: string;
  focus: string;
  difficulty: TopicDifficulty;
  status: LearningPathStepStatus;
  order: number;
  estimatedMinutes: number;
  quizMode: LearningPathQuizMode;
}

export interface PersonalizedLearningPathResult {
  generatedAt: string;
  source: LearningPathSource;
  summary: string;
  steps: PersonalizedLearningPathStep[];
}

interface AgentLearningPathStep {
  kind: LearningPathStepKind;
  topicId?: string | null;
  reason?: string;
  focus?: string;
  estimatedMinutes?: number;
}

interface AgentLearningPath {
  summary?: string;
  steps: AgentLearningPathStep[];
}

@Injectable()
export class GetPersonalizedLearningPathUseCase {
  private readonly logger = new Logger(GetPersonalizedLearningPathUseCase.name);

  constructor(
    private readonly repo: IEducationRepository,
    private readonly ragAgent: AzureFoundryAgentClient,
    private readonly context: IPersonalizedQuizContextPort,
  ) {}

  async execute(
    cmd: GetPersonalizedLearningPathCommand,
  ): Promise<PersonalizedLearningPathResult> {
    const language = cmd.language === 'en' ? 'en' : 'es';
    const [topics, spendingContext] = await Promise.all([
      this.repo.listTopics(cmd.userId),
      this.buildSpendingContext(cmd.userId),
    ]);

    if (topics.length === 0) {
      return this.buildFallbackPath([], spendingContext, language);
    }

    try {
      const agentPath = await this.generatePathWithAgent(topics, spendingContext, language);
      const normalized = this.normalizeAgentPath(agentPath, topics, spendingContext, language);

      if (normalized.steps.length === 0) {
        return this.buildFallbackPath(topics, spendingContext, language);
      }

      return normalized;
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          userId: cmd.userId,
          errorName: err instanceof Error ? err.name : 'UnknownError',
        }),
      );
      return this.buildFallbackPath(topics, spendingContext, language);
    }
  }

  private async generatePathWithAgent(
    topics: EducationTopicEntity[],
    context: SpendingContext,
    language: string,
  ): Promise<AgentLearningPath> {
    const response = await this.ragAgent.ask({
      financialContext: this.buildAgentFinancialContext(context),
      taskInstructions: this.buildPathSystemPrompt(language),
      message: this.buildPathUserPrompt(topics, language),
    });

    const parsed = this.parseAgentPath(response.answer);
    this.logger.log(
      JSON.stringify({
        userId: context.userId,
        generatedSteps: parsed.steps.length,
        usedRag: response.metadata.usedRag,
        mode: response.metadata.mode,
        sourcesCount: response.sources.length,
      }),
    );
    return parsed;
  }

  private normalizeAgentPath(
    path: AgentLearningPath,
    topics: EducationTopicEntity[],
    context: SpendingContext,
    language: string,
  ): PersonalizedLearningPathResult {
    const byId = new Map(topics.map((topic) => [topic.id, topic]));
    const usedTopics = new Set<string>();
    let personalizedQuizCount = 0;
    const steps: PersonalizedLearningPathStep[] = [];

    for (const rawStep of path.steps) {
      if (steps.length >= 6) break;

      if (rawStep.kind === 'topic') {
        const topicId = typeof rawStep.topicId === 'string' ? rawStep.topicId : null;
        const topic = topicId ? byId.get(topicId) : undefined;
        if (!topic || usedTopics.has(topic.id)) continue;

        usedTopics.add(topic.id);
        steps.push(
          this.topicStep(topic, {
            order: steps.length + 1,
            reason: this.cleanSentence(rawStep.reason) ?? this.reasonForTopic(topic),
            focus: this.cleanSentence(rawStep.focus) ?? this.focusForTopic(topic),
            estimatedMinutes: this.normalizeMinutes(rawStep.estimatedMinutes, this.estimateTopicMinutes(topic)),
          }),
        );
        continue;
      }

      if (rawStep.kind === 'personalized_quiz' && personalizedQuizCount < 2) {
        personalizedQuizCount++;
        steps.push(
          this.personalizedQuizStep({
            order: steps.length + 1,
            language,
            context,
            reason:
              this.cleanSentence(rawStep.reason) ??
              this.defaultPersonalizedQuizReason(language),
            focus:
              this.cleanSentence(rawStep.focus) ??
              this.defaultPersonalizedQuizFocus(language),
            estimatedMinutes: this.normalizeMinutes(rawStep.estimatedMinutes, 6),
          }),
        );
      }
    }

    if (!steps.some((step) => step.kind === 'personalized_quiz') && steps.length < 6) {
      const insertAt = Math.min(2, steps.length);
      steps.splice(
        insertAt,
        0,
        this.personalizedQuizStep({
          order: insertAt + 1,
          language,
          context,
          reason: this.defaultPersonalizedQuizReason(language),
          focus: this.defaultPersonalizedQuizFocus(language),
          estimatedMinutes: 6,
        }),
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      source: 'agent',
      summary:
        this.cleanSentence(path.summary) ??
        (language === 'es'
          ? 'Ruta personalizada con tus temas pendientes y tu contexto financiero reciente.'
          : 'Personalized path based on your pending topics and recent financial context.'),
      steps: this.renumber(steps),
    };
  }

  private buildFallbackPath(
    topics: EducationTopicEntity[],
    context: SpendingContext,
    language: string,
  ): PersonalizedLearningPathResult {
    const sortedTopics = [...topics].sort((a, b) => {
      const aDone = a.isCompleted ? 1 : 0;
      const bDone = b.isCompleted ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const aRead = a.isRead ? 1 : 0;
      const bRead = b.isRead ? 1 : 0;
      if (aRead !== bRead) return aRead - bRead;

      return this.difficultyRank(a.difficulty) - this.difficultyRank(b.difficulty) || a.order - b.order;
    });

    const steps = sortedTopics.slice(0, 5).map((topic, index) =>
      this.topicStep(topic, {
        order: index + 1,
        reason: this.reasonForTopic(topic),
        focus: this.focusForTopic(topic),
        estimatedMinutes: this.estimateTopicMinutes(topic),
      }),
    );

    const quizIndex = Math.min(2, steps.length);
    steps.splice(
      quizIndex,
      0,
      this.personalizedQuizStep({
        order: quizIndex + 1,
        language,
        context,
        reason: this.defaultPersonalizedQuizReason(language),
        focus: this.defaultPersonalizedQuizFocus(language),
        estimatedMinutes: 6,
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      source: 'fallback',
      summary:
        language === 'es'
          ? 'Ruta sugerida con tus temas pendientes y un quiz IA para practicar.'
          : 'Suggested path with your pending topics and an AI quiz for practice.',
      steps: this.renumber(steps.slice(0, 6)),
    };
  }

  private topicStep(
    topic: EducationTopicEntity,
    params: {
      order: number;
      reason: string;
      focus: string;
      estimatedMinutes: number;
    },
  ): PersonalizedLearningPathStep {
    return {
      id: `topic_${topic.id}`,
      kind: 'topic',
      topicId: topic.id,
      title: topic.title,
      reason: params.reason,
      focus: params.focus,
      difficulty: topic.difficulty,
      status: this.statusForTopic(topic),
      order: params.order,
      estimatedMinutes: params.estimatedMinutes,
      quizMode: 'app_topic_quiz',
    };
  }

  private personalizedQuizStep(params: {
    order: number;
    language: string;
    context: SpendingContext;
    reason: string;
    focus: string;
    estimatedMinutes: number;
  }): PersonalizedLearningPathStep {
    return {
      id: `personalized_quiz_${params.order}`,
      kind: 'personalized_quiz',
      topicId: null,
      title:
        params.language === 'es'
          ? 'Quiz personalizado con IA'
          : 'AI personalized quiz',
      reason: params.reason,
      focus: params.focus,
      difficulty: this.profileDifficulty(params.context),
      status: 'pending',
      order: params.order,
      estimatedMinutes: params.estimatedMinutes,
      quizMode: 'ai_personalized_quiz',
    };
  }

  private renumber(steps: PersonalizedLearningPathStep[]): PersonalizedLearningPathStep[] {
    return steps.map((step, index) => ({
      ...step,
      id: step.kind === 'personalized_quiz' ? `personalized_quiz_${index + 1}` : step.id,
      order: index + 1,
    }));
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

  private buildPathSystemPrompt(language: string): string {
    const languageLabel = language === 'es' ? 'espanol peruano claro' : 'English';
    return [
      'Actua como disenador de rutas de aprendizaje de educacion financiera para Zenda.',
      'Usa el agente ZENDA, su base documental RAG y el contexto financiero agregado del usuario.',
      `Genera una ruta accionable y breve en ${languageLabel}.`,
      'La ruta debe mezclar temas existentes del app y, cuando aporte valor, un paso de quiz personalizado con IA.',
      'Usa solo topicId incluidos en la lista de temas disponibles. No inventes IDs.',
      'No generes las preguntas del quiz en esta respuesta; solo decide el paso.',
      'Maximo 6 pasos. Maximo 2 pasos personalized_quiz. Cada reason y focus debe tener maximo 120 caracteres.',
      'Evita recomendaciones de inversion especifica, trading o enriquecimiento rapido.',
      'No respondas en prosa. No uses markdown. No agregues citas visibles.',
      'Responde solo JSON valido con este schema:',
      '{"summary":"resumen breve","steps":[{"kind":"topic","topicId":"uuid","reason":"por que va aqui","focus":"que practicar","estimatedMinutes":8},{"kind":"personalized_quiz","reason":"por que va aqui","focus":"que evaluar","estimatedMinutes":6}]}',
    ].join('\n');
  }

  private buildPathUserPrompt(topics: EducationTopicEntity[], language: string): string {
    const languageLabel = language === 'es' ? 'espanol' : 'English';
    const topicList = topics
      .map((topic) =>
        [
          `id=${topic.id}`,
          `title=${this.safeText(topic.title)}`,
          `category=${this.safeText(topic.category)}`,
          `difficulty=${topic.difficulty}`,
          `status=${this.statusForTopic(topic)}`,
          `questionCount=${topic.questionCount}`,
        ].join(' | '),
      )
      .join('\n');

    return [
      `Crea un learning path personalizado en ${languageLabel}.`,
      'Prioriza temas pendientes o leidos sin completar. Usa quizzes del app para temas existentes.',
      'Inserta un quiz personalizado con IA despues de uno o dos temas cuando ayude a validar habitos reales.',
      'Temas disponibles:',
      topicList,
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
      'Contexto financiero agregado para personalizar ruta de aprendizaje:',
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

  private parseAgentPath(rawAnswer: string): AgentLearningPath {
    const jsonText = this.extractJsonObject(rawAnswer);
    const parsed = JSON.parse(jsonText) as unknown;

    if (!this.isRecord(parsed) || !Array.isArray(parsed.steps)) {
      throw new Error('Agent response did not include a steps array');
    }

    return {
      summary: this.nonEmptyString(parsed.summary) ?? undefined,
      steps: parsed.steps.flatMap((item) => {
        if (!this.isRecord(item)) return [];
        const kind = this.nonEmptyString(item.kind);
        if (kind !== 'topic' && kind !== 'personalized_quiz') return [];

        return [
          {
            kind,
            topicId: this.nonEmptyString(item.topicId),
            reason: this.nonEmptyString(item.reason) ?? undefined,
            focus: this.nonEmptyString(item.focus) ?? undefined,
            estimatedMinutes:
              typeof item.estimatedMinutes === 'number' ? item.estimatedMinutes : undefined,
          },
        ];
      }),
    };
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

  private reasonForTopic(topic: EducationTopicEntity): string {
    if (topic.isCompleted) {
      return 'Repasa este tema para reforzar lo que ya avanzaste.';
    }

    switch (topic.category.toLowerCase()) {
      case 'saving':
        return 'Te ayuda a separar dinero para metas y emergencias.';
      case 'investing':
        return 'Te prepara para entender riesgo y crecimiento sin promesas irreales.';
      case 'budgeting':
      default:
        return 'Te ayuda a ordenar gastos y tomar mejores decisiones mensuales.';
    }
  }

  private focusForTopic(topic: EducationTopicEntity): string {
    switch (topic.category.toLowerCase()) {
      case 'saving':
        return 'Ahorro, metas y constancia.';
      case 'investing':
        return 'Riesgo, plazo y decisiones informadas.';
      case 'budgeting':
      default:
        return 'Presupuesto, control de gastos y prioridades.';
    }
  }

  private defaultPersonalizedQuizReason(language: string): string {
    return language === 'es'
      ? 'Valida lo aprendido con preguntas adaptadas a tus habitos.'
      : 'Validate what you learned with questions adapted to your habits.';
  }

  private defaultPersonalizedQuizFocus(language: string): string {
    return language === 'es'
      ? 'Aplicacion practica con tus ingresos, gastos y categorias.'
      : 'Practical application with your income, expenses, and categories.';
  }

  private statusForTopic(topic: EducationTopicEntity): LearningPathStepStatus {
    if (topic.isCompleted) return 'completed';
    if (topic.isRead) return 'read';
    return 'pending';
  }

  private profileDifficulty(context: SpendingContext): TopicDifficulty {
    switch (context.userProfile.financialLiteracyLevel) {
      case 'HIGH':
        return 'ADVANCED';
      case 'MEDIUM':
        return 'INTERMEDIATE';
      case 'LOW':
      default:
        return 'BEGINNER';
    }
  }

  private difficultyRank(difficulty: TopicDifficulty): number {
    switch (difficulty) {
      case 'BEGINNER':
        return 1;
      case 'INTERMEDIATE':
        return 2;
      case 'ADVANCED':
        return 3;
    }
  }

  private estimateTopicMinutes(topic: EducationTopicEntity): number {
    const wordCount = topic.content.trim().split(/\s+/).filter(Boolean).length;
    return this.normalizeMinutes(Math.ceil(wordCount / 180) + Math.ceil(topic.questionCount / 2), 8);
  }

  private normalizeMinutes(value: number | undefined, fallback: number): number {
    const numeric = Number.isFinite(value) ? Number(value) : fallback;
    return Math.min(20, Math.max(3, Math.round(numeric)));
  }

  private cleanSentence(value: string | undefined): string | null {
    if (!value) return null;
    return this.safeText(value).slice(0, 140);
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
      .slice(0, 180);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
