import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser } from '../fixtures';
import { SubmitFeedbackUseCase } from '../../src/modules/feedback/application/use-cases/submit-feedback.use-case';

describe('Feedback (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const submitFeedback = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [{ provide: SubmitFeedbackUseCase, useValue: submitFeedback }],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('POST /api/feedback without a token → 401', async () => {
    ({ app } = await createTestApp());
    const res = await request(app.getHttpServer())
      .post('/api/feedback')
      .send({ message: 'Buena app' });
    expect(res.status).toBe(401);
  });

  it('POST /api/feedback → 201 with {id}', async () => {
    submitFeedback.execute.mockResolvedValue({ id: 'fb-1' });
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/feedback')
      .set('Authorization', 'Bearer test')
      .send({ type: 'SUGGESTION', message: 'Agreguen modo oscuro', rating: 5 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'fb-1' });
  });

  it('POST /api/feedback → 400 when message is missing', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/feedback')
      .set('Authorization', 'Bearer test')
      .send({ type: 'BUG' });
    expect(res.status).toBe(400);
  });
});
