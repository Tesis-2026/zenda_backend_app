import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, UUID, makeChallenge } from '../fixtures';
import { IChallengeRepository } from '../../src/modules/challenges/domain/ports/challenge.repository';

describe('Challenges (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const repo = { list: jest.fn(), accept: jest.fn(), complete: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [{ provide: IChallengeRepository, useValue: repo }],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/challenges without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/challenges')).status).toBe(401);
  });

  it('GET /api/challenges → 200 with {id, title, reward, status} per challenge', async () => {
    repo.list.mockResolvedValue([makeChallenge()]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/challenges')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 'challenge-1',
      title: expect.any(String),
      status: 'AVAILABLE',
    });
    // ARCH-38: the API exposes a single `reward` string. The Flutter model
    // expects separate `pointsReward` / `badgeReward` fields, which the
    // backend does NOT send. Asserting the present contract pins the gap.
    expect(res.body[0]).toHaveProperty('reward');
    expect(res.body[0]).not.toHaveProperty('pointsReward');
    expect(res.body[0]).not.toHaveProperty('badgeReward');
  });

  it('POST /api/challenges/:id/accept → 200, status flips to ACTIVE', async () => {
    repo.accept.mockResolvedValue(
      makeChallenge({ id: UUID, status: 'ACTIVE', acceptedAt: new Date() }),
    );
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post(`/api/challenges/${UUID}/accept`)
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: UUID, status: 'ACTIVE' });
  });

  it('POST /api/challenges/:id/complete → 200, status flips to COMPLETED', async () => {
    repo.complete.mockResolvedValue(
      makeChallenge({ id: UUID, status: 'COMPLETED', completedAt: new Date() }),
    );
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post(`/api/challenges/${UUID}/complete`)
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: UUID, status: 'COMPLETED' });
  });
});
