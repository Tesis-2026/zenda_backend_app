import { AzureFoundryAgentClient } from '../../src/infra/ai/azure-foundry-agent.client';
import { GetExpensePredictionUseCase } from '../../src/modules/predictions/application/use-cases/get-expense-prediction.use-case';
import { PredictionEntity } from '../../src/modules/predictions/domain/prediction.entity';
import { IPredictionRepository } from '../../src/modules/predictions/domain/ports/prediction.repository';
import { BadgesFacade } from '../../src/modules/badges/application/facades/badges.facade';

const context = {
  userId: 'user-1',
  userProfile: {
    financialLiteracyLevel: 'LOW' as const,
    age: 21,
    university: 'Universidad Zenda',
    incomeType: 'ALLOWANCE',
    averageMonthlyIncome: 1200,
  },
  months: [
    {
      period: '2026-04',
      totalIncome: 1200,
      totalExpenses: 500,
      categories: [
        { categoryId: 'cat-food', categoryName: 'Comida', totalAmount: 250, transactionCount: 8 },
        { categoryId: 'cat-transport', categoryName: 'Transporte', totalAmount: 100, transactionCount: 6 },
      ],
    },
    {
      period: '2026-05',
      totalIncome: 1200,
      totalExpenses: 700,
      categories: [
        { categoryId: 'cat-food', categoryName: 'Comida', totalAmount: 320, transactionCount: 10 },
        { categoryId: 'cat-transport', categoryName: 'Transporte', totalAmount: 130, transactionCount: 7 },
      ],
    },
    {
      period: '2026-06',
      totalIncome: 1200,
      totalExpenses: 900,
      categories: [
        { categoryId: 'cat-food', categoryName: 'Comida', totalAmount: 420, transactionCount: 12 },
        { categoryId: 'cat-transport', categoryName: 'Transporte', totalAmount: 160, transactionCount: 8 },
      ],
    },
  ],
};

function createUseCase(agentAnswer: string | Error) {
  const repo = {
    getSpendingContext: jest.fn().mockResolvedValue(context),
    upsert: jest.fn(async (prediction) =>
      new PredictionEntity(
        prediction.id,
        prediction.userId,
        prediction.period,
        prediction.type,
        prediction.predictedTotal,
        prediction.predictedByCategory,
        prediction.confidenceLevel,
        prediction.confidenceInterval,
        prediction.narrative,
        prediction.modelVersion,
        prediction.actualTotal,
        prediction.accuracy,
        new Date('2026-06-20T00:00:00.000Z'),
      ),
    ),
    countByUser: jest.fn().mockResolvedValue(1),
  };
  const ragAgent = {
    ask:
      agentAnswer instanceof Error
        ? jest.fn().mockRejectedValue(agentAnswer)
        : jest.fn().mockResolvedValue({
            answer: agentAnswer,
            sources: [],
            metadata: {
              agent: 'ZENDA',
              usedRag: true,
              mode: 'foundry_agent',
            },
          }),
  };
  const badges = { awardIfNotEarned: jest.fn() };

  return {
    useCase: new GetExpensePredictionUseCase(
      repo as unknown as IPredictionRepository,
      ragAgent as unknown as AzureFoundryAgentClient,
      badges as unknown as BadgesFacade,
    ),
    repo,
    ragAgent,
  };
}

describe('Expense prediction through Azure Foundry Agent', () => {
  it('generates and stores the next-month prediction using the ZENDA RAG agent', async () => {
    const agentAnswer = JSON.stringify({
      predictedTotal: 850.5,
      predictedByCategory: [
        { categoryId: 'cat-food', categoryName: 'Comida', amount: 390 },
        { categoryId: 'cat-transport', categoryName: 'Transporte', amount: 150 },
      ],
      confidenceLevel: 'medium',
      narrative: 'Tus gastos recientes muestran una tendencia creciente en comida y transporte.',
    });
    const { useCase, repo, ragAgent } = createUseCase(agentAnswer);

    const result = await useCase.execute('user-1');

    expect(ragAgent.ask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskInstructions: expect.stringContaining('Responde solo JSON valido'),
        financialContext: expect.stringContaining('categoryId=cat-food'),
        message: expect.stringContaining('prediccion de gastos'),
      }),
    );
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'EXPENSE',
        predictedTotal: 850.5,
        confidenceLevel: 'medium',
        modelVersion: 'rag-agent-ZENDA',
        predictedByCategory: [
          { categoryId: 'cat-food', categoryName: 'Comida', amount: 390 },
          { categoryId: 'cat-transport', categoryName: 'Transporte', amount: 150 },
        ],
      }),
    );
    expect(result.modelVersion).toBe('rag-agent-ZENDA');
  });

  it('falls back to the weighted statistical prediction when the RAG agent fails', async () => {
    const { useCase, repo, ragAgent } = createUseCase(new Error('agent unavailable'));

    const result = await useCase.execute('user-1');

    expect(ragAgent.ask).toHaveBeenCalledTimes(1);
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        predictedTotal: 760,
        confidenceLevel: 'medium',
        modelVersion: 'statistical-fallback',
      }),
    );
    expect(result.modelVersion).toBe('statistical-fallback');
  });

  it('loads a low-confidence RAG prediction when transaction history is sparse', async () => {
    const sparseAnswer = JSON.stringify({
      predictedTotal: 500,
      predictedByCategory: [{ categoryId: 'cat-food', categoryName: 'Comida', amount: 250 }],
      confidenceLevel: 'low',
      narrative: 'Aun hay pocos registros, asi que la prediccion debe tomarse como una estimacion inicial.',
    });
    const { useCase, repo, ragAgent } = createUseCase(sparseAnswer);
    repo.getSpendingContext.mockResolvedValueOnce({
      ...context,
      months: [context.months[0]],
    });

    const result = await useCase.execute('user-1');

    expect(ragAgent.ask).toHaveBeenCalledTimes(1);
    expect(result.confidenceLevel).toBe('low');
    expect(result.modelVersion).toBe('rag-agent-ZENDA');
  });
});
