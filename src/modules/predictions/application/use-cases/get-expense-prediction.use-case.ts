import { Injectable, Logger } from '@nestjs/common';
import { PredictionResult, SpendingContext } from '../../../../infra/ai/AiProvider';
import { AzureFoundryAgentClient } from '../../../../infra/ai/azure-foundry-agent.client';
import { BadgesFacade } from '../../../badges/application/facades/badges.facade';
import { IPredictionRepository } from '../../domain/ports/prediction.repository';
import { PredictionEntity, deriveConfidenceInterval } from '../../domain/prediction.entity';
import { randomUUID } from 'crypto';

const PREDICTOR_THRESHOLD = 3;
const RAG_MODEL_PREFIX = 'rag-agent';

@Injectable()
export class GetExpensePredictionUseCase {
  private readonly logger = new Logger(GetExpensePredictionUseCase.name);

  constructor(
    private readonly predictionRepo: IPredictionRepository,
    private readonly ragAgent: AzureFoundryAgentClient,
    private readonly badges: BadgesFacade,
  ) {}

  async execute(userId: string): Promise<PredictionEntity> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const period = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    const context = await this.predictionRepo.getSpendingContext(userId, 3);
    const result = await this.predictWithRagAgent(context);

    const prediction = await this.predictionRepo.upsert({
      id: randomUUID(),
      userId,
      period,
      type: 'EXPENSE',
      predictedTotal: result.predictedTotal,
      predictedByCategory: result.predictedByCategory,
      confidenceLevel: result.confidenceLevel,
      confidenceInterval: deriveConfidenceInterval(result.predictedTotal, result.confidenceLevel),
      narrative: result.narrative,
      modelVersion: result.modelVersion,
      actualTotal: null,
      accuracy: null,
    });

    const viewCount = await this.predictionRepo.countByUser(userId);
    if (viewCount >= PREDICTOR_THRESHOLD) {
      await this.badges.awardIfNotEarned(userId, 'Predictor');
    }

    return prediction;
  }

  private async predictWithRagAgent(context: SpendingContext): Promise<PredictionResult> {
    try {
      const response = await this.ragAgent.ask({
        financialContext: this.buildAgentFinancialContext(context),
        taskInstructions: this.buildPredictionSystemPrompt(),
        message: this.buildPredictionUserPrompt(),
      });
      const parsed = this.parsePredictionResponse(response.answer, context);

      this.logger.log(
        JSON.stringify({
          userId: context.userId,
          usedRag: response.metadata.usedRag,
          mode: response.metadata.mode,
          sourcesCount: response.sources.length,
          predictedTotal: parsed.predictedTotal,
          confidenceLevel: parsed.confidenceLevel,
        }),
      );

      return {
        ...parsed,
        modelVersion: `${RAG_MODEL_PREFIX}-${response.metadata.agent}`,
      };
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          userId: context.userId,
          errorName: err instanceof Error ? err.name : 'UnknownError',
          fallback: 'statistical',
        }),
        err instanceof Error ? err.stack : undefined,
      );
      return this.statisticalPrediction(context);
    }
  }

  private buildPredictionSystemPrompt(): string {
    return [
      'Actua como el motor de predicciones financieras de Zenda.',
      'Usa el agente ZENDA, su base documental RAG y el contexto financiero agregado del usuario.',
      'Predice los gastos del proximo mes para un estudiante universitario peruano.',
      'Usa solo datos agregados del contexto. No inventes datos personales ni transacciones.',
      'No recomiendes inversiones especificas, trading ni promesas de ganancia rapida.',
      'predictedByCategory debe usar solo categoryId y categoryName presentes en el contexto.',
      'Si hay menos de dos meses con movimientos, no falles: devuelve una prediccion conservadora con confidenceLevel "low".',
      'Si no hay gastos registrados, usa predictedTotal 0, predictedByCategory [] y explica que se necesitan mas registros.',
      'Si la evidencia es limitada, usa confidenceLevel "low" o "medium".',
      'No respondas en prosa. No uses markdown. No agregues citas visibles.',
      'Responde solo JSON valido con este schema exacto:',
      '{"predictedTotal":123.45,"predictedByCategory":[{"categoryId":"id","categoryName":"name","amount":12.34}],"confidenceLevel":"high","narrative":"explicacion breve en espanol"}',
    ].join('\n');
  }

  private buildPredictionUserPrompt(): string {
    return [
      'Genera la prediccion de gastos del proximo mes.',
      'Incluye un total, desglose por categorias de gasto, nivel de confianza y una narrativa breve.',
    ].join('\n');
  }

  private buildAgentFinancialContext(context: SpendingContext): string {
    const profile = context.userProfile;
    const months = context.months.length
      ? context.months
          .map((month) => {
            const categories = month.categories.length
              ? month.categories
                  .slice(0, 8)
                  .map(
                    (category) =>
                      `categoryId=${this.safeText(category.categoryId)}, categoryName=${this.safeText(category.categoryName)}, amount=S/${this.formatNumber(category.totalAmount)}, count=${category.transactionCount}`,
                  )
                  .join('; ')
              : 'Sin categorias de gasto registradas';
            return `- ${month.period}: ingresos S/${this.formatNumber(month.totalIncome)}, gastos S/${this.formatNumber(month.totalExpenses)}, categorias: ${categories}`;
          })
          .join('\n')
      : '- Sin historial reciente.';

    return [
      'Contexto financiero agregado para prediccion de gastos:',
      `- Nivel de educacion financiera: ${profile.financialLiteracyLevel ?? 'No registrado'}`,
      `- Edad: ${profile.age ?? 'No registrada'}`,
      `- Universidad: ${profile.university ? this.safeText(profile.university) : 'No registrada'}`,
      `- Tipo de ingreso: ${profile.incomeType ?? 'No registrado'}`,
      `- Ingreso mensual promedio declarado: ${
        profile.averageMonthlyIncome !== null
          ? `S/${this.formatNumber(profile.averageMonthlyIncome)}`
          : 'No registrado'
      }`,
      'Meses recientes ordenados del mas antiguo al mas reciente:',
      months,
    ].join('\n');
  }

  private parsePredictionResponse(
    rawAnswer: string,
    context: SpendingContext,
  ): Omit<PredictionResult, 'modelVersion'> {
    const jsonText = this.extractJsonObject(rawAnswer);
    const parsed = JSON.parse(jsonText) as unknown;

    if (!this.isRecord(parsed)) {
      throw new Error('Agent response is not an object');
    }

    const predictedTotal = this.numberValue(parsed.predictedTotal);
    const confidenceLevel = this.normalizeConfidence(parsed.confidenceLevel);
    const narrative = this.nonEmptyString(parsed.narrative);

    if (predictedTotal === null || predictedTotal < 0 || !confidenceLevel || !narrative) {
      throw new Error('Agent prediction response is incomplete');
    }

    const predictedByCategory = this.parseCategoryPredictions(
      parsed.predictedByCategory,
      context,
    );

    return {
      predictedTotal: Number(predictedTotal.toFixed(2)),
      predictedByCategory,
      confidenceLevel,
      narrative,
    };
  }

  private parseCategoryPredictions(
    value: unknown,
    context: SpendingContext,
  ): PredictionResult['predictedByCategory'] {
    if (!Array.isArray(value)) return [];

    const categoryLookup = new Map<string, { categoryId: string; categoryName: string }>();
    for (const month of context.months) {
      for (const category of month.categories) {
        categoryLookup.set(category.categoryId, {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
        });
        categoryLookup.set(category.categoryName.toLowerCase(), {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
        });
      }
    }

    return value.flatMap((item) => {
      if (!this.isRecord(item)) return [];

      const amount = this.numberValue(item.amount);
      if (amount === null || amount < 0) return [];

      const rawId = this.nonEmptyString(item.categoryId);
      const rawName = this.nonEmptyString(item.categoryName);
      const known =
        (rawId ? categoryLookup.get(rawId) : undefined) ??
        (rawName ? categoryLookup.get(rawName.toLowerCase()) : undefined);

      if (!known) return [];

      return [
        {
          categoryId: known.categoryId,
          categoryName: known.categoryName,
          amount: Number(amount.toFixed(2)),
        },
      ];
    });
  }

  private statisticalPrediction(context: SpendingContext): PredictionResult {
    const weights = [0.5, 0.3, 0.2];
    const sorted = [...context.months].sort((a, b) => b.period.localeCompare(a.period));

    let totalWeight = 0;
    let weightedTotal = 0;

    sorted.slice(0, 3).forEach((month, index) => {
      const weight = weights[index] ?? 0.1;
      weightedTotal += month.totalExpenses * weight;
      totalWeight += weight;
    });

    const predictedTotal = totalWeight > 0 ? weightedTotal / totalWeight : 0;
    const categoryMap = new Map<string, { name: string; total: number; weight: number }>();

    sorted.slice(0, 3).forEach((month, index) => {
      const weight = weights[index] ?? 0.1;
      month.categories.forEach((category) => {
        const existing = categoryMap.get(category.categoryId);
        if (existing) {
          existing.total += category.totalAmount * weight;
          existing.weight += weight;
        } else {
          categoryMap.set(category.categoryId, {
            name: category.categoryName,
            total: category.totalAmount * weight,
            weight,
          });
        }
      });
    });

    const predictedByCategory = Array.from(categoryMap.entries()).map(([id, value]) => ({
      categoryId: id,
      categoryName: value.name,
      amount: Number((value.total / value.weight).toFixed(2)),
    }));
    const confidenceLevel = context.months.length >= 3 ? 'medium' : 'low';

    return {
      predictedTotal: Number(predictedTotal.toFixed(2)),
      predictedByCategory,
      confidenceLevel,
      narrative: `Basado en tu historial, se estima que gastaras S/${predictedTotal.toFixed(2)} el proximo mes.`,
      modelVersion: 'statistical-fallback',
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

  private normalizeConfidence(value: unknown): PredictionResult['confidenceLevel'] | null {
    const raw = this.nonEmptyString(value)?.toLowerCase();
    if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
    return null;
  }

  private numberValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
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
