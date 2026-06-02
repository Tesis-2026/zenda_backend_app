import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeBadge } from '../fixtures';
import { IBadgeRepository } from '../../src/modules/badges/domain/ports/badge.repository';

describe('Badges (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const repo = { list: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [{ provide: IBadgeRepository, useValue: repo }],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/badges without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/badges')).status).toBe(401);
  });

  it('GET /api/badges → 200 with {id, name, criteria, isEarned, earnedAt}', async () => {
    repo.list.mockResolvedValue([
      makeBadge(),
      makeBadge({ id: 'badge-2', name: 'Primer Ahorro', isEarned: true, earnedAt: new Date() }),
    ]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/badges')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: 'badge-1',
      name: expect.any(String),
      criteria: expect.any(String),
      isEarned: false,
    });
    expect(res.body[1]).toMatchObject({ isEarned: true });
  });
});
