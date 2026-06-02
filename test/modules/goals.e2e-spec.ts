import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeGoal } from '../fixtures';
import { CreateGoalUseCase } from '../../src/modules/goals/application/use-cases/create-goal.use-case';
import { ListGoalsUseCase } from '../../src/modules/goals/application/use-cases/list-goals.use-case';
import { ContributeToGoalUseCase } from '../../src/modules/goals/application/use-cases/contribute-to-goal.use-case';

describe('Goals (contract — mocked use cases, no DB)', () => {
  let app: INestApplication;
  const list = { execute: jest.fn() };
  const create = { execute: jest.fn() };
  const contribute = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: ListGoalsUseCase, useValue: list },
        { provide: CreateGoalUseCase, useValue: create },
        { provide: ContributeToGoalUseCase, useValue: contribute },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/goals without a token → 401', async () => {
    ({ app } = await createTestApp());
    const res = await request(app.getHttpServer()).get('/api/goals');
    expect(res.status).toBe(401);
  });

  it('GET /api/goals → 200 with SavingsGoal shape (completedAt nullable, no deletedAt)', async () => {
    list.execute.mockResolvedValue([makeGoal()]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/goals')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      name: 'Fondo de Emergencia',
      targetAmount: 3000,
      currentAmount: 850,
      isCompleted: false,
      completedAt: null,
    });
    expect(res.body[0]).not.toHaveProperty('deletedAt');
  });

  it('POST /api/goals (valid) → 201', async () => {
    create.execute.mockResolvedValue(makeGoal({ name: 'Viaje a Cusco', targetAmount: 1200 }));
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/goals')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Viaje a Cusco', targetAmount: 1200 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Viaje a Cusco', targetAmount: 1200 });
  });

  it('POST /api/goals (invalid body) → 400', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/goals')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });
});
