import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeProgressSnapshot } from '../fixtures';
import { ListUserProgressUseCase } from '../../src/modules/financial-progress/application/use-cases/list-user-progress.use-case';
import { GetCurrentPeriodProgressUseCase } from '../../src/modules/financial-progress/application/use-cases/get-current-period-progress.use-case';

describe('Financial Progress (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const list = { execute: jest.fn() };
  const current = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: ListUserProgressUseCase, useValue: list },
        { provide: GetCurrentPeriodProgressUseCase, useValue: current },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/financial-progress without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/financial-progress')).status).toBe(401);
  });

  it('GET /api/financial-progress → 200 with snapshot shape', async () => {
    list.execute.mockResolvedValue([makeProgressSnapshot()]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/financial-progress')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      period: '2026-05',
      budgetComplianceScore: 80,
      savingsRatePct: 30,
      recommendationsAccepted: 2,
      quizzesCompleted: 3,
    });
  });

  it('GET /api/financial-progress/current → 200 with the current snapshot', async () => {
    current.execute.mockResolvedValue(makeProgressSnapshot());
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/financial-progress/current')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ period: '2026-05' });
  });
});
