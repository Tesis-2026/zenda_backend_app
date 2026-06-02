import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser } from '../fixtures';
import { GetMonthSummaryUseCase } from '../../src/modules/insights/application/use-cases/get-month-summary.use-case';

describe('Insights / summary (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const month = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [{ provide: GetMonthSummaryUseCase, useValue: month }],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/summary/month without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/summary/month?year=2026&month=5')).status).toBe(401);
  });

  it('GET /api/summary/month (missing query) → 400', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/summary/month')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(400);
  });

  it('GET /api/summary/month?year=2026&month=5 → 200', async () => {
    month.execute.mockResolvedValue({ totalIncome: 1200, totalExpense: 480, balance: 720, topCategories: [] });
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/summary/month?year=2026&month=5')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalIncome: 1200, totalExpense: 480 });
  });

  it('GET /api/summary/progress → 200 with {currentMonth, previousMonth, changes} (computed via mocked Prisma)', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/summary/progress')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currentMonth');
    expect(res.body).toHaveProperty('previousMonth');
    expect(res.body).toHaveProperty('changes');
  });
});
