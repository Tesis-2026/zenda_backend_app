import { Injectable, Logger } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AzureFoundryAgentClient,
  sanitizeAgentVisibleCitations,
} from '../ai/azure-foundry-agent.client';
import { PrismaService } from '../prisma/prisma.service';

export interface SpendingAnomalyAlert {
  categoryName: string;
  pctOver: number;
  currentTotal: number;
  historicalAverage: number;
  explanation: string;
  explanationSource: 'rag-agent' | 'local-fallback';
}

@Injectable()
export class SpendingAlertService {
  private readonly logger = new Logger(SpendingAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragAgent: AzureFoundryAgentClient,
  ) {}

  /**
   * US-016: Returns an anomaly alert if the current month's category spending
   * exceeds the 3-month rolling average by more than 20%. The threshold is
   * statistical; the explanation is personalized by the ZENDA RAG agent.
   */
  async checkAnomaly(
    userId: string,
    categoryId: string,
    transactionDate: Date,
  ): Promise<SpendingAnomalyAlert | null> {
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth() + 1; // 1-12

    const currentMonthStart = new Date(year, month - 1, 1);
    const currentMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const currentAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        occurredAt: { gte: currentMonthStart, lte: currentMonthEnd },
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const currentTotal = (currentAgg._sum.amount ?? new Decimal(0)).toNumber();
    if (currentTotal === 0) return null;

    // Rolling average over the three months immediately preceding the current one
    const threeMonthsAgo = new Date(year, month - 4, 1);
    const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const historicalAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        occurredAt: { gte: threeMonthsAgo, lte: prevMonthEnd },
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const historicalTotal = (
      historicalAgg._sum.amount ?? new Decimal(0)
    ).toNumber();
    if (historicalTotal === 0) return null; // no baseline — can't compare

    const historicalAvg = historicalTotal / 3;
    const pctOver = ((currentTotal - historicalAvg) / historicalAvg) * 100;
    if (pctOver <= 20) return null;

    const categoryName = await this.getCategoryName(categoryId);
    const roundedPctOver = Math.round(pctOver);
    const baseAlert = {
      categoryName,
      pctOver: roundedPctOver,
      currentTotal: Number(currentTotal.toFixed(2)),
      historicalAverage: Number(historicalAvg.toFixed(2)),
    };
    const explanationResult = await this.generateAgentExplanation({
      userId,
      categoryId,
      categoryName,
      transactionDate,
      currentTotal,
      historicalAvg,
      pctOver: roundedPctOver,
    });

    return {
      ...baseAlert,
      explanation: explanationResult.explanation,
      explanationSource: explanationResult.source,
    };
  }

  private async getCategoryName(categoryId: string): Promise<string> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });
    return category?.name ?? 'esta categoria';
  }

  private async generateAgentExplanation(params: {
    userId: string;
    categoryId: string;
    categoryName: string;
    transactionDate: Date;
    currentTotal: number;
    historicalAvg: number;
    pctOver: number;
  }): Promise<{
    explanation: string;
    source: SpendingAnomalyAlert['explanationSource'];
  }> {
    try {
      const financialContext = await this.buildAgentFinancialContext(params);
      const response = await this.ragAgent.ask({
        financialContext,
        taskInstructions: this.buildAlertSystemPrompt(),
        message: this.buildAlertUserPrompt(params),
      });
      const explanation = this.normalizeExplanation(response.answer);

      this.logger.log(
        JSON.stringify({
          userId: params.userId,
          categoryId: params.categoryId,
          pctOver: params.pctOver,
          usedRag: response.metadata.usedRag,
          mode: response.metadata.mode,
          sourcesCount: response.sources.length,
        }),
      );

      return { explanation, source: 'rag-agent' };
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          userId: params.userId,
          categoryId: params.categoryId,
          pctOver: params.pctOver,
          errorName: err instanceof Error ? err.name : 'UnknownError',
          fallback: 'local-explanation',
        }),
      );
      return {
        explanation: this.localExplanation(params),
        source: 'local-fallback',
      };
    }
  }

  private async buildAgentFinancialContext(params: {
    userId: string;
    categoryId: string;
    categoryName: string;
    transactionDate: Date;
    currentTotal: number;
    historicalAvg: number;
    pctOver: number;
  }): Promise<string> {
    const monthStart = new Date(
      params.transactionDate.getFullYear(),
      params.transactionDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      params.transactionDate.getFullYear(),
      params.transactionDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const threeMonthsAgo = new Date(
      params.transactionDate.getFullYear(),
      params.transactionDate.getMonth() - 3,
      1,
    );

    const [
      user,
      currentCategoryTransactions,
      currentTopCategories,
      recentIncome,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          age: true,
          university: true,
          incomeType: true,
          averageMonthlyIncome: true,
          financialLiteracyLevel: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId: params.userId,
          categoryId: params.categoryId,
          type: TransactionType.EXPENSE,
          occurredAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        orderBy: { occurredAt: 'desc' },
        take: 8,
        select: { amount: true, occurredAt: true, description: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId: params.userId,
          type: TransactionType.EXPENSE,
          occurredAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: params.userId,
          type: TransactionType.INCOME,
          occurredAt: { gte: threeMonthsAgo, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
    ]);

    const topCategoryNames = await this.categoryNameMap(
      currentTopCategories
        .map((item) => item.categoryId)
        .filter((id): id is string => Boolean(id)),
    );
    const monthLabel = `${params.transactionDate.getFullYear()}-${String(
      params.transactionDate.getMonth() + 1,
    ).padStart(2, '0')}`;
    const transactions = currentCategoryTransactions.length
      ? currentCategoryTransactions
          .map(
            (tx) =>
              `- S/${this.formatMoney(tx.amount.toNumber())} el ${tx.occurredAt.toISOString().slice(0, 10)}${
                tx.description ? `, nota: ${this.safeText(tx.description)}` : ''
              }`,
          )
          .join('\n')
      : '- Sin transacciones recientes en esta categoria.';
    const topCategories = currentTopCategories.length
      ? currentTopCategories
          .map((item) => {
            const amount = (item._sum.amount ?? new Decimal(0)).toNumber();
            const categoryName = item.categoryId
              ? (topCategoryNames.get(item.categoryId) ?? 'Sin categoria')
              : 'Sin categoria';
            return `- ${this.safeText(categoryName)}: S/${this.formatMoney(amount)}, movimientos ${item._count._all}`;
          })
          .join('\n')
      : '- Sin gastos este mes.';

    return [
      'Contexto agregado para alerta de gasto inusual de Zenda:',
      `- Mes evaluado: ${monthLabel}`,
      `- Categoria alertada: ${this.safeText(params.categoryName)}`,
      `- Gasto actual en categoria: S/${this.formatMoney(params.currentTotal)}`,
      `- Promedio mensual historico de 3 meses en categoria: S/${this.formatMoney(params.historicalAvg)}`,
      `- Exceso detectado: ${params.pctOver}% sobre el promedio`,
      `- Ingreso reciente registrado en los ultimos 3 meses: S/${this.formatMoney((recentIncome._sum.amount ?? new Decimal(0)).toNumber())}`,
      `- Perfil: edad ${user?.age ?? 'no registrada'}, universidad ${
        user?.university ? this.safeText(user.university) : 'no registrada'
      }, tipo de ingreso ${user?.incomeType ?? 'no registrado'}, ingreso promedio declarado ${
        user?.averageMonthlyIncome !== null &&
        user?.averageMonthlyIncome !== undefined
          ? `S/${this.formatMoney(user.averageMonthlyIncome.toNumber())}`
          : 'no registrado'
      }, nivel financiero ${user?.financialLiteracyLevel ?? 'no registrado'}`,
      'Ultimos movimientos de la categoria este mes:',
      transactions,
      'Categorias con mas gasto este mes:',
      topCategories,
    ].join('\n');
  }

  private async categoryNameMap(
    categoryIds: string[],
  ): Promise<Map<string, string>> {
    if (categoryIds.length === 0) return new Map();
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    return new Map(categories.map((category) => [category.id, category.name]));
  }

  private buildAlertSystemPrompt(): string {
    return [
      'Actua como el agente financiero ZENDA para alertas de gasto inusual.',
      'La deteccion del umbral ya fue calculada por el backend; no la contradigas.',
      'Usa el contexto financiero agregado del usuario y la base documental RAG para explicar el riesgo de forma educativa.',
      'La respuesta sera usada como notificacion/aviso dentro de la app.',
      'No inventes datos, no menciones que eres un modelo, no incluyas citas visibles ni nombres de archivos.',
      'No recomiendes inversiones, credito nuevo ni acciones riesgosas.',
      'Escribe en espanol peruano claro, maximo 45 palabras, con tono amable y accion concreta.',
      'Devuelve solo el texto final, sin markdown.',
    ].join('\n');
  }

  private buildAlertUserPrompt(params: {
    categoryName: string;
    currentTotal: number;
    historicalAvg: number;
    pctOver: number;
  }): string {
    return [
      `Explica por que el gasto en ${this.safeText(params.categoryName)} merece atencion.`,
      `Datos clave: gasto actual S/${this.formatMoney(params.currentTotal)}, promedio S/${this.formatMoney(params.historicalAvg)}, exceso ${params.pctOver}%.`,
      'Da una recomendacion breve y accionable para lo que queda del mes.',
    ].join('\n');
  }

  private normalizeExplanation(answer: string): string {
    const clean = sanitizeAgentVisibleCitations(answer)
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) throw new Error('Empty anomaly explanation');
    return clean.length > 260 ? `${clean.slice(0, 257).trim()}...` : clean;
  }

  private localExplanation(params: {
    categoryName: string;
    currentTotal: number;
    historicalAvg: number;
    pctOver: number;
  }): string {
    return `Tu gasto en ${params.categoryName} va ${params.pctOver}% sobre tu promedio. Revisa los ultimos movimientos y fija un limite para lo que queda del mes.`;
  }

  private formatMoney(value: number): string {
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
}
