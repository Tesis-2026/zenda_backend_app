import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeRecommendation } from '../fixtures';
import { GetRecommendationsUseCase } from '../../src/modules/recommendations/application/use-cases/get-recommendations.use-case';
import { IRecommendationRepository } from '../../src/modules/recommendations/domain/ports/recommendation.repository';

describe('Recommendations (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const getRecs = { execute: jest.fn() };
  const repo = { getStats: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: GetRecommendationsUseCase, useValue: getRecs },
        { provide: IRecommendationRepository, useValue: repo },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/recommendations without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/recommendations')).status).toBe(401);
  });

  it('GET /api/recommendations → 200 with {message, suggestedAction, isActive, ...lifecycle}', async () => {
    getRecs.execute.mockResolvedValue([makeRecommendation()]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/recommendations')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 'rec-1',
      type: 'SAVINGS',
      message: expect.any(String),
      isActive: true,
    });
    expect(res.body[0]).toHaveProperty('suggestedAction');
  });

  it('GET /api/recommendations/stats → 200 with {total, accepted, acceptanceRate}', async () => {
    repo.getStats.mockResolvedValue({ total: 5, accepted: 2, acceptanceRate: 40 });
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/recommendations/stats')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 5, accepted: 2, acceptanceRate: 40 });
  });
});
