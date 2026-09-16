import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BudgetsFacadeImpl } from '../../src/modules/budgets/application/budgets.facade';
import { Decimal } from '@prisma/client/runtime/library';
import {
  financialDateKey,
  financialDayBounds,
  financialMonthBounds,
  financialWeekBounds,
  moneyDifference,
} from '../../src/shared/finance/financial-period';
import { PrismaInsightsRepository } from '../../src/modules/insights/infrastructure/persistence/prisma-insights.repository';
import { IdempotencyService } from '../../src/shared/idempotency/idempotency.service';
import { SurveysController } from '../../src/modules/surveys/interface/surveys.controller';
import { ResearchDashboardController } from '../../src/modules/research-dashboard/interface/research-dashboard.controller';
import { CompleteGoalUseCase } from '../../src/modules/goals/application/use-cases/complete-goal.use-case';
import { PrismaGoalsRepository } from '../../src/modules/goals/infrastructure/persistence/prisma-goals.repository';
import { AnalyticsService } from '../../src/infra/analytics/analytics.service';
import { safeTelemetryMetadata } from '../../src/infra/analytics/telemetry-policy';
import { redactSensitiveQuery } from '../../src/shared/logger/request-logging.interceptor';
import { createPrismaMock } from '../support/prisma.mock';

describe('Pilot regressions (unit/repository mocks, NOT PostgreSQL integration)', () => {
  test.each([null, { month: 5, year: 2026 }])(
    'budget must belong to owner and occurrence period',
    async (row) => {
      const repo = { findById: jest.fn().mockResolvedValue(row) };
      const facade = new BudgetsFacadeImpl(repo as any);
      await expect(
        facade.assertAccessibleForDate(
          'a',
          'budget-b',
          new Date('2026-06-15T12:00:00Z'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('budget-b', 'a');
    },
  );
  test('budget uses Lima period on UTC month boundary', async () => {
    const facade = new BudgetsFacadeImpl({
      findById: jest.fn().mockResolvedValue({ month: 6, year: 2026 }),
    } as any);
    await expect(
      facade.assertAccessibleForDate(
        'a',
        'budget-a',
        new Date('2026-07-01T04:00:00Z'),
      ),
    ).resolves.toBeUndefined();
  });
  test.each(['2026-02-30', '2026-13-01', 'not-a-date'])(
    'reject invalid date %s',
    (date) => {
      expect(() => financialDayBounds(date)).toThrow(BadRequestException);
    },
  );
  test('Lima day/month boundaries are independent from server timezone', () => {
    expect(financialDateKey(new Date('2026-07-01T04:59:59Z'))).toBe(
      '2026-06-30',
    );
    expect(financialMonthBounds(2026, 6)).toEqual({
      from: new Date('2026-06-01T05:00:00Z'),
      to: new Date('2026-07-01T04:59:59.999Z'),
    });
    expect(financialDayBounds('2024-02-29').from.toISOString()).toBe(
      '2024-02-29T05:00:00.000Z',
    );
  });
  test('ISO week crosses year correctly', () => {
    expect(financialWeekBounds(2026, 1).from.toISOString()).toBe(
      '2025-12-29T05:00:00.000Z',
    );
  });
  test('PEN balance preserves cents', () => {
    expect(moneyDifference(51.01, 50.99)).toBe(0.02);
    expect(moneyDifference(0, 1.25)).toBe(-1.25);
  });
  test('daily totals exclude transfers and use the same Lima day', async () => {
    const db = createPrismaMock();
    db.transaction.findMany.mockResolvedValue([
      {
        type: 'INCOME',
        amount: new Decimal('51.01'),
        occurredAt: new Date('2026-07-01T01:00:00Z'),
      },
      {
        type: 'EXPENSE',
        amount: new Decimal('0.1'),
        occurredAt: new Date('2026-06-30T15:00:00Z'),
      },
      {
        type: 'EXPENSE',
        amount: new Decimal('0.2'),
        occurredAt: new Date('2026-06-30T15:01:00Z'),
      },
      {
        type: 'TRANSFER',
        amount: new Decimal('500'),
        occurredAt: new Date('2026-06-30T15:00:00Z'),
      },
    ]);
    const result = await new PrismaInsightsRepository(db).getDailyBreakdown({
      userId: 'participant-a',
      ...financialDayBounds('2026-06-30'),
    });
    expect(result).toEqual([
      { date: '2026-06-30', totalIncome: 51.01, totalExpense: 0.3 },
    ]);
    expect(db.transaction.findMany.mock.calls[0][0].where).toMatchObject({
      userId: 'participant-a',
      deletedAt: null,
      type: { in: ['INCOME', 'EXPENSE'] },
    });
  });
  test('unknown/deleted category lookup is owner-scoped and does not invent Other', async () => {
    const db = createPrismaMock();
    db.transaction.groupBy.mockResolvedValue([
      { categoryId: 'old-cat', _sum: { amount: new Decimal(5) } },
    ]);
    const result = await new PrismaInsightsRepository(db).getPeriodSummary({
      userId: 'a',
      ...financialDayBounds('2026-01-01'),
    });
    expect(result.topCategories).toEqual([
      { name: 'Sin categoria', amount: 5 },
    ]);
    expect(db.category.findMany.mock.calls[0][0].where.OR).toEqual([
      { userId: 'a' },
      { userId: null, type: 'SYSTEM' },
    ]);
  });
  test('database reservation prevents concurrent duplicate handlers and replays completed result', async () => {
    const rows = new Map<string, any>();
    const db: any = {
      idempotencyKey: {
        create: jest.fn(async ({ data }) => {
          const k = data.userId + data.key;
          if (rows.has(k)) throw { code: 'P2002' };
          rows.set(k, { ...data });
        }),
        findUnique: jest.fn(
          async ({ where }) =>
            rows.get(where.key_userId.userId + where.key_userId.key) ?? null,
        ),
        update: jest.fn(async ({ where, data }) =>
          Object.assign(
            rows.get(where.key_userId.userId + where.key_userId.key),
            data,
          ),
        ),
      },
    };
    const service = new IdempotencyService(db);
    const p = { key: 'draft-1', userId: 'a', requestHash: 'h' };
    const results = await Promise.allSettled([
      service.claim(p),
      service.claim(p),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await service.store({ ...p, statusCode: 201, body: { id: 'tx-1' } });
    expect(await service.claim(p)).toEqual({
      statusCode: 201,
      body: { id: 'tx-1' },
    });
    await expect(
      service.claim({ ...p, requestHash: 'changed' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await service.claim({ ...p, userId: 'b' })).toBeNull();
  });
  test('stable request hashes ignore property ordering, not amounts', () => {
    const s = new IdempotencyService({} as any);
    expect(s.computeRequestHash('post', '/x', { a: 1, b: 2 })).toBe(
      s.computeRequestHash('POST', '/x', { b: 2, a: 1 }),
    );
    expect(s.computeRequestHash('POST', '/x', { a: 1 })).not.toBe(
      s.computeRequestHash('POST', '/x', { a: 2 }),
    );
  });
  test.each([{}, { q: '5abc' }, { q: 5 }, { q: '', extra: '1' }])(
    'survey rejects invalid answers %j',
    (answers) => {
      const controller = new SurveysController(
        {} as any,
        {} as any,
        {} as any,
      ) as any;
      const qs = [{ id: 'q', order: 1, options: ['1', '2', '3', '4', '5'] }];
      expect(() => {
        controller.assertCompleteAnswers(qs, answers);
        controller.assertValidLikertAnswers(qs, answers);
      }).toThrow(BadRequestException);
    },
  );
  test('SUS rejects truncated instrument instead of reporting misleading score', async () => {
    const db = createPrismaMock();
    db.survey.findFirst.mockResolvedValue({ id: 'sus', questionsJson: [] });
    await expect(
      new SurveysController(db, {} as any, {} as any).submitSus('a', {
        answers: {},
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.surveyResponse.create).not.toHaveBeenCalled();
  });
  test('goal cannot invent missing funds when marked complete', async () => {
    const repo = {
      findById: jest
        .fn()
        .mockResolvedValue({ currentAmount: 10, targetAmount: 100 }),
      complete: jest.fn(),
    };
    const service = new CompleteGoalUseCase(repo as any, {} as any, {} as any);
    await expect(service.execute('a', 'goal')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.complete).not.toHaveBeenCalled();
  });
  test('contribution writes increment and ledger within one transaction callback', async () => {
    const db = createPrismaMock();
    db.savingsGoal.update.mockResolvedValue({
      id: 'g',
      userId: 'a',
      name: 'Goal',
      targetAmount: new Decimal(100),
      currentAmount: new Decimal(20),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await new PrismaGoalsRepository(db).contributeAtomically('a', 'g', 10);
    expect(db.savingsGoal.update).toHaveBeenCalledWith({
      where: { id: 'g', userId: 'a', deletedAt: null, completedAt: null },
      data: { currentAmount: { increment: 10 } },
    });
    expect(db.goalContribution.create).toHaveBeenCalledWith({
      data: { goalId: 'g', amount: 10 },
    });
  });
  test('telemetry removes arbitrary text, identifiers and nonfinite values', () => {
    expect(
      safeTelemetryMetadata({
        email: 'synthetic',
        description: 'private',
        amount: 99,
        latency_ms: 5,
        score: NaN,
        source: 'ocr',
        has_budget: true,
      }),
    ).toEqual({ latency_ms: 5, source: 'ocr', has_budget: true });
  });
  test.each([
    null,
    { consentGiven: false },
    { consentGiven: true, deletedAt: new Date() },
  ])('no analytics without active consent %j', async (user) => {
    const db = createPrismaMock();
    db.user.findUnique.mockResolvedValue(user);
    await new AnalyticsService(db).trackAsync('a', 'screen_view', {
      screen: 'dashboard',
    });
    expect(db.analyticsEvent.create).not.toHaveBeenCalled();
  });
  test('research dashboard requires configuration even outside production', async () => {
    const service = new ResearchDashboardController(
      {} as any,
      new ConfigService({ app: { nodeEnv: 'development' } }),
    );
    await expect(service.summary({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
  test('malformed query encoding does not crash logging', () => {
    expect(() => redactSensitiveQuery('/x?%ZZ=abc')).not.toThrow();
    expect(redactSensitiveQuery('/x?token=synthetic')).not.toContain(
      'synthetic',
    );
  });
});
