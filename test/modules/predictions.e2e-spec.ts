import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makePrediction } from '../fixtures';
import { GetExpensePredictionUseCase } from '../../src/modules/predictions/application/use-cases/get-expense-prediction.use-case';
import { IPredictionRepository } from '../../src/modules/predictions/domain/ports/prediction.repository';
import { BadgesFacade } from '../../src/modules/badges/application/facades/badges.facade';

describe('Predictions (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const getExpenses = { execute: jest.fn() };
  const predRepo = { findByUserAndPeriod: jest.fn(), recordActuals: jest.fn() };
  const badges = { awardIfNotEarned: jest.fn().mockResolvedValue(undefined) };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: GetExpensePredictionUseCase, useValue: getExpenses },
        { provide: IPredictionRepository, useValue: predRepo },
        { provide: BadgesFacade, useValue: badges },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/predictions/expenses without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/predictions/expenses')).status).toBe(401);
  });

  it('GET /api/predictions/expenses → 200 with {predictedTotal, confidenceInterval, predictedByCategory}', async () => {
    getExpenses.execute.mockResolvedValue(makePrediction());
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/predictions/expenses')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      predictedTotal: 500,
      confidenceLevel: 'medium',
      confidenceInterval: { lower: 425, upper: 575 },
    });
    expect(Array.isArray(res.body.predictedByCategory)).toBe(true);
  });

  it('POST /api/predictions/accuracy-check (invalid body) → 400', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/predictions/accuracy-check')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/predictions/accuracy-check → 404 when no stored prediction', async () => {
    predRepo.findByUserAndPeriod.mockResolvedValue(null);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/predictions/accuracy-check')
      .set('Authorization', 'Bearer test')
      .send({ month: 2026, year: 5 }); // DTO: month∈[2020,2100], year∈[1,12]
    expect(res.status).toBe(404);
  });
});
