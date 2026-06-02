import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import * as bcrypt from 'bcrypt';

import { createTestApp } from '../support/create-test-app';
import { IUserRepository } from '../../src/modules/auth/domain/ports/user.repository';
import { IRefreshTokenRepository } from '../../src/modules/auth/domain/ports/refresh-token.repository';

/**
 * Auth contract pilot — proves the e2e harness for a real flow with mocked
 * repository ports (no DB). Verifies the request shapes the Flutter app sends
 * and the response shapes its `fromJson` reads.
 */

const PASSWORD = 'Password123!';

/** Minimal fake of the domain user the use cases read. */
function makeUserEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ana@test.com',
    fullName: 'Ana Pérez',
    passwordHash: '', // set per test
    tokenVersion: 0,
    consentGiven: false,
    isLocked: false,
    lockedUntil: null,
    ...overrides,
  };
}

function fakeUserRepo(partial: Partial<IUserRepository>): IUserRepository {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    incrementFailedLogin: jest.fn().mockResolvedValue(1),
    clearFailedLogin: jest.fn().mockResolvedValue(undefined),
    lockAccount: jest.fn().mockResolvedValue(undefined),
    bumpTokenVersion: jest.fn().mockResolvedValue(1),
    ...partial,
  } as unknown as IUserRepository;
}

const fakeRefreshRepo: IRefreshTokenRepository = {
  create: jest.fn().mockResolvedValue(undefined),
  findByToken: jest.fn().mockResolvedValue(null),
  deleteByToken: jest.fn().mockResolvedValue(undefined),
  deleteByUserId: jest.fn().mockResolvedValue(undefined),
} as unknown as IRefreshTokenRepository;

describe('Auth (contract pilot — mocked ports, no DB)', () => {
  let app: INestApplication;

  async function boot(userRepo: IUserRepository) {
    const ctx = await createTestApp({
      overrides: [
        { provide: IUserRepository, useValue: userRepo },
        { provide: IRefreshTokenRepository, useValue: fakeRefreshRepo },
      ],
    });
    app = ctx.app;
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  // ── Validation (request interpretation) ──────────────────────────────────

  it('POST /api/auth/register → 400 when fields are missing/invalid', async () => {
    await boot(fakeUserRepo({}));
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login → 400 when body is empty', async () => {
    await boot(fakeUserRepo({}));
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });

  // ── Error contract ───────────────────────────────────────────────────────

  it('POST /api/auth/login → 401 for a non-existent user', async () => {
    await boot(fakeUserRepo({ findByEmail: jest.fn().mockResolvedValue(null) }));
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  // ── Success contract (response shape the Flutter app parses) ──────────────

  it('POST /api/auth/register → 201 with {accessToken, refreshToken}', async () => {
    const created = makeUserEntity();
    await boot(
      fakeUserRepo({
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'ana@test.com', password: PASSWORD, fullName: 'Ana Pérez' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('POST /api/auth/login → 201 with {accessToken, refreshToken} on valid credentials', async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const user = makeUserEntity({ passwordHash });
    await boot(
      fakeUserRepo({ findByEmail: jest.fn().mockResolvedValue(user) }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('POST /api/auth/login → 401 with wrong password (and lockout countdown fields)', async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const user = makeUserEntity({ passwordHash });
    await boot(
      fakeUserRepo({
        findByEmail: jest.fn().mockResolvedValue(user),
        incrementFailedLogin: jest.fn().mockResolvedValue(1),
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: 'WrongPassword999!' });

    expect(res.status).toBe(401);
    // B14 contract the Flutter login screen reads from the 401 body:
    expect(res.body).toHaveProperty('attemptsRemaining');
    expect(res.body).toHaveProperty('lockedUntil');
  });
});
