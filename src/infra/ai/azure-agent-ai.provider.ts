import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  ChatMessage,
  ClassificationResult,
  PersonalizedQuizQuestion,
  PersonalizedQuizResult,
  PredictionResult,
  RecommendationResult,
  SpendingContext,
  UserProfile,
} from './AiProvider';
import { AzureFoundryAgentClient } from './azure-foundry-agent.client';
import { StatisticalFallbackProvider } from './statistical-fallback.provider';

// Single AI integration point for the whole backend: every capability
// (prediction, recommendations, classification, quiz, chat) is served by the
// customized Azure AI Foundry agent "ZENDA", so all advice is grounded in the
// same financial-education knowledge base and authenticated the same way
// (managed identity). The deterministic StatisticalFallbackProvider is the
// safety net: any agent failure (timeout, auth, empty/unparseable output)
// degrades gracefully instead of breaking the feature.
@Injectable()
export class AzureAgentAiProvider implements AiProvider {
  readonly name = 'azure-foundry-agent';
  private readonly logger = new Logger(AzureAgentAiProvider.name);

  constructor(
    private readonly agent: AzureFoundryAgentClient,
    private readonly fallback: StatisticalFallbackProvider,
  ) {}

  async predictExpenses(context: SpendingContext): Promise<PredictionResult> {
    try {
      const parsed = await this.askJson<{
        predictedTotal: number;
        predictedByCategory: Array<{ categoryId: string; categoryName: string; amount: number }>;
        confidenceLevel: 'high' | 'medium' | 'low';
        narrative: string;
      }>({
        taskInstructions: [
          'Eres un asistente financiero para estudiantes universitarios peruanos.',
          'Analiza el historial de gastos y predice el gasto del próximo mes.',
          'Responde SOLO con JSON válido, sin texto adicional, con esta estructura exacta:',
          '{"predictedTotal": number, "predictedByCategory": [{"categoryId": "id", "categoryName": "name", "amount": number}], "confidenceLevel": "high"|"medium"|"low", "narrative": "string en español (2-3 oraciones)"}',
        ].join('\n'),
        message: 'Genera la predicción de gastos para el próximo mes con base en el contexto financiero.',
        context,
      });

      return {
        predictedTotal: parsed.predictedTotal,
        predictedByCategory: parsed.predictedByCategory ?? [],
        confidenceLevel: parsed.confidenceLevel,
        narrative: parsed.narrative,
        modelVersion: `foundry-agent-${this.agent.agentName}`,
      };
    } catch (err) {
      this.logFallback('predictExpenses', err);
      return this.fallback.predictExpenses(context);
    }
  }

  async generateRecommendations(context: SpendingContext): Promise<RecommendationResult[]> {
    try {
      const parsed = await this.askJson<{ recommendations: RecommendationResult[] }>({
        taskInstructions: [
          'Eres un asesor financiero para estudiantes universitarios peruanos.',
          'Genera entre 2 y 5 recomendaciones personalizadas y fundamentadas en buenas prácticas financieras.',
          'Responde SOLO con JSON válido, sin texto adicional, con esta estructura exacta:',
          '{"recommendations": [{"type": "SAVINGS"|"BUDGET"|"GOAL", "message": "mensaje en español (máximo 80 palabras)", "suggestedAction": "acción concreta en español (máximo 30 palabras)"}]}',
          this.describeUserProfile(context.userProfile),
        ].join('\n'),
        message: 'Genera recomendaciones financieras personalizadas con base en el contexto.',
        context,
      });

      const recommendations = parsed.recommendations ?? [];
      if (recommendations.length === 0) {
        throw new Error('Agent returned zero recommendations');
      }
      return recommendations;
    } catch (err) {
      this.logFallback('generateRecommendations', err);
      return this.fallback.generateRecommendations(context);
    }
  }

  async classifyTransaction(description: string, amount: number): Promise<ClassificationResult> {
    try {
      const parsed = await this.askJson<ClassificationResult>({
        taskInstructions: [
          'Clasifica transacciones financieras de estudiantes universitarios peruanos.',
          'Categorías disponibles: Comida, Transporte, Educación, Entretenimiento, Salud, Vivienda, Servicios, Ropa, Otros.',
          'Responde SOLO con JSON válido, sin texto adicional: {"categoryName": "string", "confidence": number_0_to_1}',
        ].join('\n'),
        message: `Descripción: "${description}", Monto: S/${amount}`,
      });

      return {
        categoryName: parsed.categoryName ?? 'Otros',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      };
    } catch (err) {
      this.logFallback('classifyTransaction', err);
      return this.fallback.classifyTransaction(description, amount);
    }
  }

  async generatePersonalizedQuiz(
    context: SpendingContext,
    language: string,
  ): Promise<PersonalizedQuizResult> {
    const isEs = language === 'es';
    const langLabel = isEs ? 'en español' : 'in English';
    try {
      const parsed = await this.askJson<{ questions: PersonalizedQuizQuestion[] }>({
        taskInstructions: [
          'Eres un generador de quizzes de educación financiera para estudiantes universitarios peruanos.',
          `Genera exactamente 5 preguntas de opción múltiple ${langLabel} sobre finanzas personales, adaptadas a los hábitos de gasto del usuario.`,
          'Cada pregunta tiene exactamente 4 opciones (A, B, C, D) y una sola respuesta correcta.',
          'Distribución de dificultad: 2 BEGINNER, 2 INTERMEDIATE, 1 ADVANCED.',
          'Responde SOLO con JSON válido, sin texto adicional, con esta estructura exacta:',
          '{"questions": [{"text": "string", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A) texto exacto", "difficulty": "BEGINNER"|"INTERMEDIATE"|"ADVANCED"}]}',
          this.describeUserProfile(context.userProfile),
        ].join('\n'),
        message: 'Genera 5 preguntas personalizadas enfocadas en los hábitos de gasto del usuario.',
        context,
      });

      const questions = parsed.questions ?? [];
      if (questions.length === 0) {
        throw new Error('Agent returned zero quiz questions');
      }
      return { questions: questions.slice(0, 5) };
    } catch (err) {
      this.logFallback('generatePersonalizedQuiz', err);
      return this.fallback.generatePersonalizedQuiz(context, language);
    }
  }

  async chat(messages: ChatMessage[], userProfile?: UserProfile): Promise<string> {
    const conversation = messages.filter((m) => m.role !== 'system');
    const last = conversation[conversation.length - 1];
    if (!last) {
      return this.fallback.chat(messages, userProfile);
    }

    try {
      const response = await this.agent.ask({
        financialContext: userProfile
          ? this.describeUserProfile(userProfile)
          : 'Sin perfil financiero disponible.',
        message: last.content,
        conversationHistory: conversation
          .slice(0, -1)
          .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
      });
      return response.answer;
    } catch (err) {
      this.logFallback('chat', err);
      return this.fallback.chat(messages, userProfile);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Calls the agent with a task that must return strict JSON and parses the
   * answer defensively (agents may wrap JSON in prose or citation markers).
   * Throws on empty/unparseable output so the caller can fall back.
   */
  private async askJson<T>(input: {
    taskInstructions: string;
    message: string;
    context?: SpendingContext;
  }): Promise<T> {
    const response = await this.agent.ask({
      taskInstructions: input.taskInstructions,
      financialContext: input.context
        ? this.summariseContext(input.context)
        : 'Sin contexto financiero adicional.',
      message: input.message,
    });
    return this.extractJson<T>(response.answer);
  }

  private extractJson<T>(text: string): T {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    const objStart = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');
    const starts = [objStart, arrStart].filter((i) => i >= 0);
    if (starts.length === 0) {
      throw new Error('Agent response contained no JSON');
    }
    const start = Math.min(...starts);
    const isArray = start === arrStart && (objStart < 0 || arrStart < objStart);
    const end = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
    if (end < start) {
      throw new Error('Agent response had an unterminated JSON block');
    }

    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }

  private summariseContext(context: SpendingContext): string {
    if (context.months.length === 0) {
      return 'El usuario no tiene historial de gastos registrado.';
    }
    const months = context.months
      .map((m) => {
        const cats = m.categories
          .map((c) => `  - ${c.categoryName}: S/${c.totalAmount.toFixed(2)}`)
          .join('\n');
        return `Periodo ${m.period}: gastos=S/${m.totalExpenses.toFixed(2)}, ingresos=S/${m.totalIncome.toFixed(2)}\n${cats}`;
      })
      .join('\n');
    return `Historial de gastos del estudiante (${context.months.length} meses):\n${months}`;
  }

  private describeUserProfile(profile: UserProfile): string {
    const level = profile.financialLiteracyLevel;
    const levelInstruction =
      level === 'HIGH'
        ? 'El usuario tiene un nivel ALTO de educación financiera; puedes usar terminología técnica.'
        : level === 'MEDIUM'
          ? 'El usuario tiene un nivel MEDIO de educación financiera; usa lenguaje claro con términos explicados.'
          : 'El usuario tiene un nivel BAJO de educación financiera; usa lenguaje muy sencillo y consejos básicos.';

    const parts: string[] = [levelInstruction];
    if (profile.age) parts.push(`Edad: ${profile.age} años.`);
    if (profile.university) parts.push(`Universidad: ${profile.university}.`);
    if (profile.incomeType) parts.push(`Fuente de ingresos: ${profile.incomeType}.`);
    if (profile.averageMonthlyIncome) {
      parts.push(`Ingreso mensual promedio: S/${profile.averageMonthlyIncome.toFixed(2)}.`);
    }
    return parts.join(' ');
  }

  private logFallback(operation: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`Foundry agent ${operation} failed, using statistical fallback: ${message}`);
  }
}
