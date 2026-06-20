import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AzureFoundryAgentClient,
  AzureFoundryAgentConfigurationError,
} from '../../src/infra/ai/azure-foundry-agent.client';
import { FinancialContextService } from '../../src/modules/conversations/application/services/financial-context.service';
import { createPrismaMock } from '../support/prisma.mock';

const dec = (value: number) => ({ toNumber: () => value });

describe('RAG financial context (unit-style, mocked Prisma)', () => {
  it('builds a safe aggregated financial context without sensitive fields', async () => {
    const prisma = createPrismaMock();
    const service = new FinancialContextService(prisma);

    prisma.user.findFirst.mockResolvedValue({
      averageMonthlyIncome: dec(1200),
      currency: 'PEN',
    });
    prisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: dec(1200) } })
      .mockResolvedValueOnce({ _sum: { amount: dec(450) } });
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: 'cat-food', _sum: { amount: dec(260) }, _count: { _all: 6 } },
      { categoryId: 'cat-transport', _sum: { amount: dec(90) }, _count: { _all: 4 } },
    ]);
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-food', name: 'Delivery ana@example.com 12345678' },
      { id: 'cat-transport', name: 'Transporte' },
    ]);
    prisma.savingsGoal.findFirst.mockResolvedValue({
      name: 'Fondo DNI 87654321',
      targetAmount: dec(1000),
      currentAmount: dec(250),
      dueDate: new Date('2026-08-31T00:00:00.000Z'),
    });
    prisma.userFinancialProgress.findFirst.mockResolvedValue({ savingsRatePct: dec(62.5) });

    const context = await service.buildForUser('user-1', new Date('2026-06-04T12:00:00.000Z'));

    expect(context.monthlyIncomeApprox).toBe(1200);
    expect(context.monthlyExpenses).toBe(450);
    expect(context.savingsRatePct).toBe(62.5);
    expect(context.topCategories).toHaveLength(2);
    expect(context.focusExpenses.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Delivery [redactado] [numero]', 'Transporte']),
    );
    expect(context.activeSavingsGoal).toMatchObject({
      name: 'Fondo DNI [numero]',
      progressPct: 25,
    });
    expect(context.prompt).not.toContain('ana@example.com');
    expect(context.prompt).not.toContain('12345678');
    expect(context.prompt).not.toContain('87654321');
    expect(context.prompt).not.toContain('user-1');
  });

  it('builds a general context when the user has no financial data', async () => {
    const prisma = createPrismaMock();
    const service = new FinancialContextService(prisma);

    prisma.user.findFirst.mockResolvedValue({
      averageMonthlyIncome: null,
      currency: 'PEN',
    });
    prisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.savingsGoal.findFirst.mockResolvedValue(null);
    prisma.userFinancialProgress.findFirst.mockResolvedValue(null);

    const context = await service.buildForUser('user-1', new Date('2026-06-04T12:00:00.000Z'));

    expect(context.monthlyIncomeApprox).toBeNull();
    expect(context.monthlyExpenses).toBe(0);
    expect(context.topCategories).toEqual([]);
    expect(context.prompt).toContain('No registrado');
    expect(context.prompt).toContain('Sin categorias de gasto registradas este mes.');
  });

  it('throws a clean not-found error for a missing user', async () => {
    const prisma = createPrismaMock();
    const service = new FinancialContextService(prisma);

    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.buildForUser('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws a configuration error when Azure Agent env vars are missing', async () => {
    const config = new ConfigService({
      azureAiAgent: {
        agentName: 'ZENDA',
      },
    });
    const client = new AzureFoundryAgentClient(config);

    await expect(
      client.ask({
        financialContext: 'Contexto financiero del usuario: sin datos.',
        message: '¿Cómo ahorro?',
      }),
    ).rejects.toBeInstanceOf(AzureFoundryAgentConfigurationError);
  });
});
