import { HttpException } from '@nestjs/common';

import { AzureFoundryAgentClient } from '../../src/infra/ai/azure-foundry-agent.client';
import { GetPersonalizedQuizUseCase } from '../../src/modules/education/application/use-cases/get-personalized-quiz.use-case';
import { IEducationRepository } from '../../src/modules/education/domain/ports/education.repository';
import { IPersonalizedQuizContextPort } from '../../src/modules/education/domain/ports/personalized-quiz-context.port';

const validAgentAnswer = JSON.stringify({
  questions: [
    {
      text: 'Como puedes aplicar la regla 50/30/20 si tienes gastos frecuentes en comida?',
      options: [
        'A) Separar necesidades, deseos y ahorro antes de gastar',
        'B) Usar todo el ingreso en comida',
        'C) Evitar registrar gastos',
        'D) Pedir un prestamo para cubrir snacks',
      ],
      correctAnswer: 'A) Separar necesidades, deseos y ahorro antes de gastar',
      difficulty: 'BEGINNER',
    },
    {
      text: 'Que accion ayuda a controlar gastos hormiga?',
      options: [
        'A) Registrar gastos pequenos por categoria',
        'B) Ignorarlos por ser pequenos',
        'C) Usar credito para todo',
        'D) No revisar el presupuesto',
      ],
      correctAnswer: 'A) Registrar gastos pequenos por categoria',
      difficulty: 'BEGINNER',
    },
    {
      text: 'Si tu gasto en transporte sube, que comparacion es util?',
      options: [
        'A) Comparar gasto actual contra meses previos',
        'B) Comparar solo con entretenimiento',
        'C) Borrar transacciones',
        'D) Cambiar de moneda',
      ],
      correctAnswer: 'A) Comparar gasto actual contra meses previos',
      difficulty: 'INTERMEDIATE',
    },
    {
      text: 'Que indicador muestra cuanto queda para ahorrar?',
      options: [
        'A) Ingresos menos gastos',
        'B) Total de opciones del quiz',
        'C) Cantidad de categorias creadas',
        'D) Numero de inicios de sesion',
      ],
      correctAnswer: 'A) Ingresos menos gastos',
      difficulty: 'INTERMEDIATE',
    },
    {
      text: 'Por que conviene evitar promesas de ganancia rapida?',
      options: [
        'A) Porque suelen implicar alto riesgo o fraude',
        'B) Porque siempre pagan intereses altos',
        'C) Porque reemplazan el presupuesto',
        'D) Porque no requieren educacion financiera',
      ],
      correctAnswer: 'A) Porque suelen implicar alto riesgo o fraude',
      difficulty: 'ADVANCED',
    },
  ],
});

function createUseCase(answer = validAgentAnswer, attemptsToday = 0) {
  const repo = {
    savePersonalizedQuestions: jest.fn(async (questions, language) =>
      questions.map((question, index) => ({
        id: `question-${index + 1}`,
        topicId: null,
        questionGroupKey: 'personalized-test',
        language,
        difficulty: question.difficulty,
        text: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
      })),
    ),
  };
  const ragAgent = {
    ask: jest.fn().mockResolvedValue({
      answer,
      sources: [],
      metadata: {
        agent: 'ZENDA',
        usedRag: true,
        mode: 'foundry_agent',
      },
    }),
  };
  const context = {
    countQuizPersonalizedAttemptsToday: jest.fn().mockResolvedValue(attemptsToday),
    getUserProfile: jest.fn().mockResolvedValue({
      financialLiteracyLevel: 'LOW',
      age: 21,
      university: 'Universidad Zenda',
      incomeType: 'ALLOWANCE',
      averageMonthlyIncome: 1200,
    }),
    listSpendingByMonth: jest.fn().mockResolvedValue([
      {
        period: '2026-06',
        totalIncome: 1200,
        totalExpenses: 650,
        categories: [
          {
            categoryId: 'cat-food',
            categoryName: 'Comida',
            totalAmount: 300,
            transactionCount: 8,
          },
        ],
      },
    ]),
  };

  return {
    useCase: new GetPersonalizedQuizUseCase(
      repo as unknown as IEducationRepository,
      ragAgent as unknown as AzureFoundryAgentClient,
      context as unknown as IPersonalizedQuizContextPort,
    ),
    repo,
    ragAgent,
    context,
  };
}

describe('Personalized quiz through Azure Foundry Agent', () => {
  it('asks the ZENDA RAG agent for strict JSON and preserves the existing response shape', async () => {
    const { useCase, repo, ragAgent } = createUseCase();

    const result = await useCase.execute({ userId: 'user-1', language: 'es' });

    expect(ragAgent.ask).toHaveBeenCalledTimes(1);
    expect(ragAgent.ask.mock.calls[0][0]).toMatchObject({
      message: expect.stringContaining('quiz personalizado'),
      taskInstructions: expect.stringContaining('Responde solo JSON valido'),
      financialContext: expect.stringContaining('Comida'),
    });
    expect(repo.savePersonalizedQuestions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.any(String),
          options: expect.any(Array),
          correctAnswer: expect.any(String),
          difficulty: 'BEGINNER',
        }),
      ]),
      'es',
    );
    expect(result).toMatchObject({
      attemptsRemainingToday: 4,
      questions: expect.arrayContaining([
        expect.objectContaining({
          id: 'question-1',
          text: expect.any(String),
          options: expect.any(Array),
        }),
      ]),
    });
    expect(result.questions).toHaveLength(5);
  });

  it('normalizes letter-only correct answers from the agent before saving', async () => {
    const answer = JSON.stringify({
      questions: [
        {
          text: 'Que deberias hacer primero al recibir tu ingreso?',
          options: ['A) Separar ahorro', 'B) Gastar todo', 'C) No registrar nada', 'D) Pedir credito'],
          correctAnswer: 'A',
          difficulty: 'BEGINNER',
        },
      ],
    });
    const { useCase, repo } = createUseCase(answer);

    await useCase.execute({ userId: 'user-1', language: 'es' });

    expect(repo.savePersonalizedQuestions.mock.calls[0][0][0]).toMatchObject({
      correctAnswer: 'A) Separar ahorro',
    });
  });

  it('does not call the agent when the daily personalized quiz limit is reached', async () => {
    const { useCase, ragAgent } = createUseCase(validAgentAnswer, 5);

    await expect(useCase.execute({ userId: 'user-1', language: 'es' })).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(ragAgent.ask).not.toHaveBeenCalled();
  });
});
