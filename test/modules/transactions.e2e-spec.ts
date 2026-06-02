import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeTransactionResult, UUID } from '../fixtures';
import { CreateTransactionUseCase } from '../../src/modules/transactions/application/use-cases/create-transaction.use-case';
import { ListTransactionsUseCase } from '../../src/modules/transactions/application/use-cases/list-transactions.use-case';
import { GetTransactionUseCase } from '../../src/modules/transactions/application/use-cases/get-transaction.use-case';
import { UpdateTransactionUseCase } from '../../src/modules/transactions/application/use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from '../../src/modules/transactions/application/use-cases/delete-transaction.use-case';
import { SpendingAlertService } from '../../src/infra/spending-alert/spending-alert.service';

describe('Transactions (contract — mocked use cases, no DB)', () => {
  let app: INestApplication;

  const list = { execute: jest.fn() };
  const create = { execute: jest.fn() };
  const get = { execute: jest.fn() };
  const update = { execute: jest.fn() };
  const del = { execute: jest.fn() };

  async function bootAuthed() {
    const ctx = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: ListTransactionsUseCase, useValue: list },
        { provide: CreateTransactionUseCase, useValue: create },
        { provide: GetTransactionUseCase, useValue: get },
        { provide: UpdateTransactionUseCase, useValue: update },
        { provide: DeleteTransactionUseCase, useValue: del },
        { provide: SpendingAlertService, useValue: { checkAnomaly: jest.fn().mockResolvedValue(null) } },
      ],
    });
    app = ctx.app;
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/transactions without a token → 401', async () => {
    const ctx = await createTestApp(); // real guard
    app = ctx.app;
    const res = await request(app.getHttpServer()).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('GET /api/transactions → 200 with an array the Flutter app parses', async () => {
    list.execute.mockResolvedValue([makeTransactionResult()]);
    await bootAuthed();

    const res = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({
      id: 'tx-1',
      type: 'expense', // normalized lowercase for the Flutter model
      amount: 25.5,
      // Embedded category carries the icon key so the tx list renders the
      // right icon without guessing from the name.
      category: { name: 'Comida', icon: 'food' },
    });
    expect(res.body[0]).not.toHaveProperty('deletedAt'); // UX-06
  });

  it('POST /api/transactions (valid) → 201 with the response shape', async () => {
    create.execute.mockResolvedValue(makeTransactionResult());
    await bootAuthed();

    const res = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', 'Bearer test')
      .send({
        type: 'EXPENSE',
        amount: 25.5,
        categoryId: UUID,
        description: 'Café',
        occurredAt: '2026-05-31T12:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'tx-1',
      type: 'expense',
      amount: 25.5,
      currency: 'PEN',
    });
  });

  it('POST /api/transactions (invalid body) → 400', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });
});
