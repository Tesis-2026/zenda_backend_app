import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser } from '../fixtures';
import { GetNotificationPreferencesUseCase } from '../../src/modules/users/application/use-cases/get-notification-preferences.use-case';
import { UpdateNotificationPreferenceUseCase } from '../../src/modules/users/application/use-cases/update-notification-preference.use-case';

describe('Notifications (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const getPreferences = { execute: jest.fn() };
  const updatePreference = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: GetNotificationPreferencesUseCase, useValue: getPreferences },
        { provide: UpdateNotificationPreferenceUseCase, useValue: updatePreference },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/notifications/preferences without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/notifications/preferences')).status).toBe(401);
  });

  it('GET /api/notifications/preferences → 200 with [{type, enabled}]', async () => {
    getPreferences.execute.mockResolvedValue([
      { type: 'BUDGET_ALERT', enabled: true },
      { type: 'DAILY_REMINDER', enabled: false },
    ]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/notifications/preferences')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { type: 'BUDGET_ALERT', enabled: true },
      { type: 'DAILY_REMINDER', enabled: false },
    ]);
  });

  it('PATCH /api/notifications/preferences/:type → 204 for a known type', async () => {
    updatePreference.execute.mockResolvedValue(undefined);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .patch('/api/notifications/preferences/BUDGET_ALERT')
      .set('Authorization', 'Bearer test')
      .send({ enabled: false });
    expect(res.status).toBe(204);
    expect(updatePreference.execute).toHaveBeenCalledWith('user-1', 'BUDGET_ALERT', false);
  });

  it('PATCH /api/notifications/preferences/:type → 400 for an unknown type', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .patch('/api/notifications/preferences/UNKNOWN_TYPE')
      .set('Authorization', 'Bearer test')
      .send({ enabled: false });
    expect(res.status).toBe(400);
  });
});
