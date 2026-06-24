import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  ChatMessage,
  ClassificationResult,
  PersonalizedQuizDifficulty,
  PersonalizedQuizQuestion,
  PersonalizedQuizResult,
  PredictionResult,
  RecommendationResult,
  SpendingContext,
  UserProfile,
} from './AiProvider';

// Deterministic, network-free implementation of every AiProvider capability.
// It is the safety net behind the Azure AI Foundry agent: when the agent fails,
// times out, is misconfigured, or returns unparseable output, these pure
// functions keep expense prediction, recommendations and quizzes working so the
// thesis reliability metrics (accuracy, critical-error rate) never depend on a
// single remote call. No external services are used here.
@Injectable()
export class StatisticalFallbackProvider implements AiProvider {
  readonly name = 'statistical-fallback';

  async predictExpenses(context: SpendingContext): Promise<PredictionResult> {
    return this.statisticalPrediction(context);
  }

  async generateRecommendations(context: SpendingContext): Promise<RecommendationResult[]> {
    return this.ruleBasedRecommendations(context);
  }

  async classifyTransaction(_description: string, _amount: number): Promise<ClassificationResult> {
    // Without a model there is no reliable signal; surface low confidence so the
    // caller can present "Otros" as a non-authoritative suggestion.
    return { categoryName: 'Otros', confidence: 0 };
  }

  async chat(_messages: ChatMessage[], _userProfile?: UserProfile): Promise<string> {
    return 'No pude procesar tu mensaje en este momento. Inténtalo de nuevo.';
  }

  async generatePersonalizedQuiz(
    _context: SpendingContext,
    language: string,
  ): Promise<PersonalizedQuizResult> {
    return { questions: this.fallbackPersonalizedQuestions(language) };
  }

  // ── Deterministic implementations ──────────────────────────────────────────

  statisticalPrediction(context: SpendingContext): PredictionResult {
    if (context.months.length === 0) {
      return {
        predictedTotal: 0,
        predictedByCategory: [],
        confidenceLevel: 'low',
        narrative: 'No hay suficiente historial para generar una predicción.',
        modelVersion: 'statistical-fallback',
      };
    }

    // 3-month weighted moving average: weights [0.5, 0.3, 0.2] newest-first
    const weights = [0.5, 0.3, 0.2];
    const sorted = [...context.months].sort((a, b) => b.period.localeCompare(a.period));

    let totalWeight = 0;
    let weightedTotal = 0;

    sorted.slice(0, 3).forEach((m, i) => {
      const w = weights[i] ?? 0.1;
      weightedTotal += m.totalExpenses * w;
      totalWeight += w;
    });

    const predictedTotal = totalWeight > 0 ? weightedTotal / totalWeight : 0;

    // Aggregate categories using same weighting
    const catMap = new Map<string, { name: string; total: number; weight: number }>();
    sorted.slice(0, 3).forEach((m, i) => {
      const w = weights[i] ?? 0.1;
      m.categories.forEach((c) => {
        const existing = catMap.get(c.categoryId);
        if (existing) {
          existing.total += c.totalAmount * w;
          existing.weight += w;
        } else {
          catMap.set(c.categoryId, { name: c.categoryName, total: c.totalAmount * w, weight: w });
        }
      });
    });

    const predictedByCategory = Array.from(catMap.entries()).map(([id, v]) => ({
      categoryId: id,
      categoryName: v.name,
      amount: Number((v.total / v.weight).toFixed(2)),
    }));

    const confidence: 'high' | 'medium' | 'low' =
      context.months.length >= 3 ? 'medium' : 'low';

    return {
      predictedTotal: Number(predictedTotal.toFixed(2)),
      predictedByCategory,
      confidenceLevel: confidence,
      narrative: `Basado en tu historial, se estima que gastarás S/${predictedTotal.toFixed(2)} el próximo mes.`,
      modelVersion: 'statistical-fallback',
    };
  }

  ruleBasedRecommendations(context: SpendingContext): RecommendationResult[] {
    const recs: RecommendationResult[] = [];

    if (context.months.length === 0) {
      recs.push({
        type: 'SAVINGS',
        message: 'Comienza a registrar tus gastos para recibir recomendaciones personalizadas.',
        suggestedAction: 'Registra al menos una transacción hoy.',
      });
      return recs;
    }

    const latest = context.months.sort((a, b) => b.period.localeCompare(a.period))[0]!;
    const savingsRate =
      latest.totalIncome > 0
        ? (latest.totalIncome - latest.totalExpenses) / latest.totalIncome
        : 0;

    if (savingsRate < 0.2) {
      recs.push({
        type: 'SAVINGS',
        message: `Tu tasa de ahorro este mes es del ${(savingsRate * 100).toFixed(0)}%. La regla 50/30/20 recomienda ahorrar al menos el 20% de tus ingresos.`,
        suggestedAction: 'Revisa tus gastos de entretenimiento y reduce al menos un 10%.',
      });
    }

    recs.push({
      type: 'BUDGET',
      message:
        'Crear presupuestos por categoría te ayuda a mantener el control de tus gastos y evitar sorpresas al final del mes.',
      suggestedAction: 'Establece un presupuesto para tu categoría de mayor gasto.',
    });

    return recs;
  }

  fallbackPersonalizedQuestions(language: string): PersonalizedQuizQuestion[] {
    const isEs = language === 'es';
    if (isEs) {
      return [
        { text: '¿Qué porcentaje de ingresos recomienda la regla 50/30/20 para necesidades básicas?', options: ['A) 20%', 'B) 30%', 'C) 50%', 'D) 70%'], correctAnswer: 'C) 50%', difficulty: 'BEGINNER' as PersonalizedQuizDifficulty },
        { text: '¿Qué se recomienda hacer primero al recibir tu salario?', options: ['A) Gastar en entretenimiento', 'B) Pagar deudas', 'C) Apartar el ahorro antes de gastar', 'D) Invertir en bolsa'], correctAnswer: 'C) Apartar el ahorro antes de gastar', difficulty: 'BEGINNER' as PersonalizedQuizDifficulty },
        { text: '¿Cuántos meses de gastos debe cubrir un fondo de emergencia?', options: ['A) 1 mes', 'B) 3 a 6 meses', 'C) 12 meses', 'D) Solo 2 semanas'], correctAnswer: 'B) 3 a 6 meses', difficulty: 'INTERMEDIATE' as PersonalizedQuizDifficulty },
        { text: '¿Cuál de estas opciones es una deuda "productiva"?', options: ['A) Deuda en tarjeta por ropa', 'B) Préstamo para estudios universitarios', 'C) Crédito para vacaciones', 'D) Deuda por artículos de lujo'], correctAnswer: 'B) Préstamo para estudios universitarios', difficulty: 'INTERMEDIATE' as PersonalizedQuizDifficulty },
        { text: '¿Qué es el interés compuesto?', options: ['A) Interés solo sobre el capital inicial', 'B) Interés calculado sobre capital más intereses acumulados', 'C) Un préstamo sin intereses', 'D) El interés mensual del banco'], correctAnswer: 'B) Interés calculado sobre capital más intereses acumulados', difficulty: 'ADVANCED' as PersonalizedQuizDifficulty },
      ];
    }
    return [
      { text: 'What percentage of income does the 50/30/20 rule recommend for basic needs?', options: ['A) 20%', 'B) 30%', 'C) 50%', 'D) 70%'], correctAnswer: 'C) 50%', difficulty: 'BEGINNER' as PersonalizedQuizDifficulty },
      { text: 'What should you do first when you receive your salary?', options: ['A) Spend on entertainment', 'B) Pay debts', 'C) Save before spending', 'D) Invest in stocks'], correctAnswer: 'C) Save before spending', difficulty: 'BEGINNER' as PersonalizedQuizDifficulty },
      { text: 'How many months of expenses should an emergency fund cover?', options: ['A) 1 month', 'B) 3 to 6 months', 'C) 12 months', 'D) Just 2 weeks'], correctAnswer: 'B) 3 to 6 months', difficulty: 'INTERMEDIATE' as PersonalizedQuizDifficulty },
      { text: 'Which of these is considered "productive debt"?', options: ['A) Credit card debt for clothing', 'B) Student loan for university', 'C) Loan for vacation', 'D) Debt for luxury items'], correctAnswer: 'B) Student loan for university', difficulty: 'INTERMEDIATE' as PersonalizedQuizDifficulty },
      { text: 'What is compound interest?', options: ['A) Interest only on the initial capital', 'B) Interest calculated on capital plus accumulated interest', 'C) An interest-free loan', 'D) The monthly bank interest'], correctAnswer: 'B) Interest calculated on capital plus accumulated interest', difficulty: 'ADVANCED' as PersonalizedQuizDifficulty },
    ];
  }
}
