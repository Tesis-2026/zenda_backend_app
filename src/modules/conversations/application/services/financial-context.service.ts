import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';

export interface FinancialContextCategory {
  name: string;
  totalAmount: number;
  transactionCount: number;
}

export interface FinancialContextGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  dueDate: string | null;
}

export interface FinancialContextSummary {
  currency: string;
  monthlyIncomeApprox: number | null;
  monthlyExpenses: number;
  topCategories: FinancialContextCategory[];
  focusExpenses: FinancialContextCategory[];
  activeSavingsGoal: FinancialContextGoal | null;
  savingsRatePct: number | null;
  debtSignal: 'NO_DEBT_MODEL';
  observations: string[];
  prompt: string;
}

const FOCUS_CATEGORY_KEYWORDS = [
  'delivery',
  'comida',
  'food',
  'snack',
  'snacks',
  'restaurante',
  'transporte',
  'transport',
  'taxi',
  'bus',
  'movilidad',
];

@Injectable()
export class FinancialContextService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForUser(userId: string, asOf = new Date()): Promise<FinancialContextSummary> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        averageMonthlyIncome: true,
        currency: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { start, end } = this.monthRange(asOf);

    const [incomeAggregate, expenseAggregate, groupedExpenses, activeGoal, latestProgress] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            userId,
            deletedAt: null,
            type: TransactionType.INCOME,
            occurredAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            deletedAt: null,
            type: TransactionType.EXPENSE,
            occurredAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: {
            userId,
            deletedAt: null,
            type: TransactionType.EXPENSE,
            occurredAt: { gte: start, lte: end },
            categoryId: { not: null },
          },
          _sum: { amount: true },
          _count: { _all: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10,
        }),
        this.prisma.savingsGoal.findFirst({
          where: { userId, deletedAt: null, completedAt: null },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
          select: {
            name: true,
            targetAmount: true,
            currentAmount: true,
            dueDate: true,
          },
        }),
        this.prisma.userFinancialProgress.findFirst({
          where: { userId },
          orderBy: { period: 'desc' },
          select: { savingsRatePct: true },
        }),
      ]);

    const categoryIds = groupedExpenses
      .map((g) => g.categoryId)
      .filter((id): id is string => typeof id === 'string');
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryNameById = new Map(categories.map((c) => [c.id, sanitizeFinancialLabel(c.name)]));

    const topCategories = groupedExpenses
      .map((g) => ({
        name: categoryNameById.get(g.categoryId ?? '') ?? 'Sin categoria',
        totalAmount: roundMoney(toNumber(g._sum.amount)),
        transactionCount: g._count._all,
      }))
      .filter((c) => c.totalAmount > 0)
      .slice(0, 5);

    const transactionIncome = toNumber(incomeAggregate._sum.amount);
    const profileIncome = toNumber(user.averageMonthlyIncome);
    const monthlyIncomeApprox = transactionIncome > 0 ? transactionIncome : profileIncome;
    const monthlyExpenses = roundMoney(toNumber(expenseAggregate._sum.amount));
    const calculatedSavingsRate =
      monthlyIncomeApprox && monthlyIncomeApprox > 0
        ? roundPercent(((monthlyIncomeApprox - monthlyExpenses) / monthlyIncomeApprox) * 100)
        : null;
    const savingsRatePct =
      calculatedSavingsRate ?? nullableRoundPercent(toNumber(latestProgress?.savingsRatePct));

    const focusExpenses = topCategories.filter((c) => this.isFocusCategory(c.name));
    const activeSavingsGoal = activeGoal
      ? {
          name: sanitizeFinancialLabel(activeGoal.name),
          targetAmount: roundMoney(toNumber(activeGoal.targetAmount)),
          currentAmount: roundMoney(toNumber(activeGoal.currentAmount)),
          progressPct: this.goalProgressPct(activeGoal.currentAmount, activeGoal.targetAmount),
          dueDate: activeGoal.dueDate?.toISOString().slice(0, 10) ?? null,
        }
      : null;

    const observations = this.buildObservations({
      monthlyExpenses,
      monthlyIncomeApprox,
      focusExpenses,
      activeSavingsGoal,
      savingsRatePct,
    });

    const summary: Omit<FinancialContextSummary, 'prompt'> = {
      currency: user.currency ?? 'PEN',
      monthlyIncomeApprox: monthlyIncomeApprox ? roundMoney(monthlyIncomeApprox) : null,
      monthlyExpenses,
      topCategories,
      focusExpenses,
      activeSavingsGoal,
      savingsRatePct,
      debtSignal: 'NO_DEBT_MODEL',
      observations,
    };

    return {
      ...summary,
      prompt: this.toPrompt(summary),
    };
  }

  private monthRange(asOf: Date): { start: Date; end: Date } {
    const start = new Date(asOf);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }

  private isFocusCategory(name: string): boolean {
    const normalized = normalizeForMatching(name);
    return FOCUS_CATEGORY_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  private goalProgressPct(currentAmount: unknown, targetAmount: unknown): number {
    const current = toNumber(currentAmount);
    const target = toNumber(targetAmount);
    if (!target || target <= 0) return 0;
    return Math.min(100, roundPercent((current / target) * 100));
  }

  private buildObservations(input: {
    monthlyExpenses: number;
    monthlyIncomeApprox: number | null;
    focusExpenses: FinancialContextCategory[];
    activeSavingsGoal: FinancialContextGoal | null;
    savingsRatePct: number | null;
  }): string[] {
    const observations: string[] = [];

    if (input.monthlyExpenses === 0) {
      observations.push('No hay gastos registrados este mes.');
    }
    if (!input.monthlyIncomeApprox) {
      observations.push('No hay ingreso mensual registrado o transacciones de ingreso este mes.');
    }
    if (input.focusExpenses.length > 0) {
      const labels = input.focusExpenses.map((c) => c.name).join(', ');
      observations.push(`Hay gastos relevantes en categorias sensibles a gasto hormiga: ${labels}.`);
    }
    if (input.activeSavingsGoal) {
      observations.push(`Meta activa de ahorro al ${input.activeSavingsGoal.progressPct}%.`);
    }
    if (input.savingsRatePct !== null && input.savingsRatePct < 20) {
      observations.push('La tasa de ahorro estimada esta por debajo del 20%.');
    }
    if (observations.length === 0) {
      observations.push('Contexto financiero limitado; responder con educacion financiera general.');
    }

    return observations;
  }

  private toPrompt(summary: Omit<FinancialContextSummary, 'prompt'>): string {
    const currencySymbol = summary.currency === 'PEN' ? 'S/' : summary.currency;
    const topCategories =
      summary.topCategories.length > 0
        ? summary.topCategories
            .map((c) => `${c.name}: ${currencySymbol} ${formatMoney(c.totalAmount)}`)
            .join('; ')
        : 'Sin categorias de gasto registradas este mes.';
    const focusExpenses =
      summary.focusExpenses.length > 0
        ? summary.focusExpenses
            .map((c) => `${c.name}: ${currencySymbol} ${formatMoney(c.totalAmount)}`)
            .join('; ')
        : 'No detectado en categorias disponibles.';
    const activeGoal = summary.activeSavingsGoal
      ? `${summary.activeSavingsGoal.name}: ${currencySymbol} ${formatMoney(
          summary.activeSavingsGoal.currentAmount,
        )} de ${currencySymbol} ${formatMoney(summary.activeSavingsGoal.targetAmount)} (${summary.activeSavingsGoal.progressPct}%).`
      : 'No hay meta activa registrada.';

    return [
      'Contexto financiero del usuario:',
      `- Ingreso mensual aproximado: ${
        summary.monthlyIncomeApprox !== null
          ? `${currencySymbol} ${formatMoney(summary.monthlyIncomeApprox)}`
          : 'No registrado'
      }`,
      `- Gasto mensual acumulado: ${currencySymbol} ${formatMoney(summary.monthlyExpenses)}`,
      `- Categorias principales: ${topCategories}`,
      `- Gasto en delivery/comida/snacks/transporte: ${focusExpenses}`,
      `- Meta activa: ${activeGoal}`,
      `- Porcentaje de ahorro estimado: ${
        summary.savingsRatePct !== null ? `${summary.savingsRatePct}%` : 'No calculable'
      }`,
      '- Deuda: no existe un modelo de deuda en la base de datos actual; no inferir deudas.',
      `- Observaciones: ${summary.observations.join(' ')}`,
      '',
      'Privacidad:',
      '- No se incluyen DNI, email, nombres completos, tarjetas, cuentas, contrasenas ni transacciones detalladas.',
    ].join('\n');
  }
}

export function sanitizeFinancialLabel(value: unknown): string {
  const raw = typeof value === 'string' ? value : '';
  const sanitized = raw
    .normalize('NFKC')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redactado]')
    .replace(/\b(?:\d[\s-]?){8,}\b/g, '[numero]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const fallback = sanitized || 'Sin nombre';
  return fallback.length > 80 ? `${fallback.slice(0, 77)}...` : fallback;
}

function normalizeForMatching(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function nullableRoundPercent(value: number): number | null {
  if (!Number.isFinite(value) || value === 0) return null;
  return roundPercent(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}
