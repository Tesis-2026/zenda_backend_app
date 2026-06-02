import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, NOW_DATE } from '../fixtures';
import { GetProfileUseCase } from '../../src/modules/users/application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../../src/modules/users/application/use-cases/update-profile.use-case';

function makeProfile(over: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ana@test.com',
    fullName: 'Ana Pérez',
    age: 21,
    university: 'PUCP',
    incomeType: 'ALLOWANCE',
    averageMonthlyIncome: 800,
    financialLiteracyLevel: 'MEDIUM',
    profileCompleted: true,
    currency: 'PEN',
    createdAt: NOW_DATE,
    consentGiven: true,
    consentAt: NOW_DATE,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...over,
  };
}

describe('Users (contract — mocked, no DB)', () => {
  let app: INestApplication;
  let prisma: any;
  const getProfile = { execute: jest.fn() };
  const updateProfile = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app, prisma } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: GetProfileUseCase, useValue: getProfile },
        { provide: UpdateProfileUseCase, useValue: updateProfile },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/users/me without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/users/me')).status).toBe(401);
  });

  it('GET /api/users/me → 200 with full profile incl. consent + lockout fields', async () => {
    getProfile.execute.mockResolvedValue(makeProfile());
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'user-1',
      email: 'ana@test.com',
      profileCompleted: true,
      currency: 'PEN',
      consentGiven: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  });

  it('PUT /api/users/me → 200 with the updated profile', async () => {
    updateProfile.execute.mockResolvedValue(makeProfile({ fullName: 'Ana María' }));
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .put('/api/users/me')
      .set('Authorization', 'Bearer test')
      .send({ fullName: 'Ana María', age: 22 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: 'Ana María' });
  });

  it('PUT /api/users/me → 400 when age is below the allowed minimum', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .put('/api/users/me')
      .set('Authorization', 'Bearer test')
      .send({ age: 5 });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/users/me → 204 (audit + delete run in one transaction)', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .delete('/api/users/me')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(204);
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(prisma.user.delete).toHaveBeenCalled();
  });
});
