import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { fixtureUser } from '../fixtures';
import { createTestApp } from '../support/create-test-app';

describe('Analytics (contract - mocked, no DB)', () => {
  let app: INestApplication;
  let prisma: any;

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('POST /api/analytics/events without a token returns 401', async () => {
    ({ app } = await createTestApp());
    const res = await request(app.getHttpServer())
      .post('/api/analytics/events')
      .send({ eventType: 'screen_view' });

    expect(res.status).toBe(401);
  });

  it('POST /api/analytics/events records a mobile event', async () => {
    ({ app, prisma } = await createTestApp({ user: fixtureUser }));

    const res = await request(app.getHttpServer())
      .post('/api/analytics/events')
      .set('Authorization', 'Bearer test')
      .send({
        eventType: 'screen_view',
        metadata: { screen: 'dashboard' },
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: true });
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        userId: fixtureUser.sub,
        eventType: 'screen_view',
        metadata: { screen: 'dashboard' },
      },
    });
  });
});
