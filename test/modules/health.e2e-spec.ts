import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';

/**
 * Smoke test — proves the contract-test harness boots the full Nest app with a
 * mocked Prisma (no DB) and serves real HTTP responses through the `/api` prefix.
 */
describe('Health (smoke — proves no-DB harness boots)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/live → 200 with {status:"ok", version, timestamp}', async () => {
    const res = await request(app.getHttpServer()).get('/api/live');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      version: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('GET /api/health → 200 with database check ok (mocked $queryRaw)', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.status).toBe('ok');
  });

  it('GET /api/ready → 200 (dependencies reachable)', async () => {
    const res = await request(app.getHttpServer()).get('/api/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
