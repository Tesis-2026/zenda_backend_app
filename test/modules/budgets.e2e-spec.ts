import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeBudget } from '../fixtures';
import { CreateBudgetUseCase } from '../../src/modules/budgets/application/use-cases/create-budget.use-case';
import { ListBudgetsUseCase } from '../../src/modules/budgets/application/use-cases/list-budgets.use-case';

describe('Budgets (contract — mocked use cases, no DB)', () => {
  let app: INestApplication;
  const list = { execute: jest.fn() };
  const create = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: ListBudgetsUseCase, useValue: list },
        { provide: CreateBudgetUseCase, useValue: create },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/budgets without a token → 401', async () => {
    ({ app } = await createTestApp());
    const res = await request(app.getHttpServer()).get('/api/budgets?month=5&year=2026');
    expect(res.status).toBe(401);
  });

  it('GET /api/budgets → 200 with Budget shape (no deletedAt — UX-06)', async () => {
    list.execute.mockResolvedValue([makeBudget()]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/budgets?month=5&year=2026')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      categoryName: 'Comida',
      amountLimit: 150,
      currentSpent: 80,
      month: 5,
      year: 2026,
    });
    expect(res.body[0]).not.toHaveProperty('deletedAt');
  });

  it('POST /api/budgets (valid) → 201', async () => {
    create.execute.mockResolvedValue(makeBudget());
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', 'Bearer test')
      .send({ amountLimit: 150, month: 5, year: 2026 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amountLimit: 150, month: 5, year: 2026 });
  });

  it('POST /api/budgets (invalid body) → 400', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });
});
