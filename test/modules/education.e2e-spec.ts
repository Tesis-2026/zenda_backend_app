import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, UUID, makeTopic, makeQuiz, makeQuizResult } from '../fixtures';
import { ListTopicsUseCase } from '../../src/modules/education/application/use-cases/list-topics.use-case';
import { GetTopicUseCase } from '../../src/modules/education/application/use-cases/get-topic.use-case';
import { CompleteTopicUseCase } from '../../src/modules/education/application/use-cases/complete-topic.use-case';
import { GetQuizUseCase } from '../../src/modules/education/application/use-cases/get-quiz.use-case';
import { SubmitQuizUseCase } from '../../src/modules/education/application/use-cases/submit-quiz.use-case';
import { GetPersonalizedQuizUseCase } from '../../src/modules/education/application/use-cases/get-personalized-quiz.use-case';

describe('Education (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const listTopics = { execute: jest.fn() };
  const getTopic = { execute: jest.fn() };
  const completeTopic = { execute: jest.fn() };
  const getQuiz = { execute: jest.fn() };
  const submitQuiz = { execute: jest.fn() };
  const getPersonalizedQuiz = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: ListTopicsUseCase, useValue: listTopics },
        { provide: GetTopicUseCase, useValue: getTopic },
        { provide: CompleteTopicUseCase, useValue: completeTopic },
        { provide: GetQuizUseCase, useValue: getQuiz },
        { provide: SubmitQuizUseCase, useValue: submitQuiz },
        { provide: GetPersonalizedQuizUseCase, useValue: getPersonalizedQuiz },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/education/topics without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/education/topics')).status).toBe(401);
  });

  it('GET /api/education/topics → 200 with {id, title, difficulty, isCompleted}', async () => {
    listTopics.execute.mockResolvedValue([makeTopic()]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/education/topics')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 'topic-1',
      title: expect.any(String),
      difficulty: 'BEGINNER',
      order: 1,
      isCompleted: false,
    });
    // ARCH-39: the topic contract currently omits `category` and
    // `questionCount`; the Flutter education screen synthesizes both.
    // This asserts the present (gap-bearing) contract so a future fix is caught.
    expect(res.body[0]).not.toHaveProperty('questionCount');
    expect(res.body[0]).not.toHaveProperty('category');
  });

  it('GET /api/education/topics/:id → 200 with topic detail', async () => {
    getTopic.execute.mockResolvedValue(makeTopic({ id: UUID }));
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get(`/api/education/topics/${UUID}`)
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: UUID, content: expect.any(String) });
  });

  it('GET /api/education/topics/:id → 404 when topic missing', async () => {
    getTopic.execute.mockResolvedValue(null);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get(`/api/education/topics/${UUID}`)
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(404);
  });

  it('GET /api/education/topics/:id/quiz → 200 with {topicId, language, questions[]}', async () => {
    getQuiz.execute.mockResolvedValue(makeQuiz({ topicId: UUID }));
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get(`/api/education/topics/${UUID}/quiz?language=es`)
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ topicId: UUID, language: 'es' });
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it('POST /api/education/topics/:id/quiz/submit → 200 with {score, level, feedback[]}', async () => {
    submitQuiz.execute.mockResolvedValue(makeQuizResult());
    completeTopic.execute.mockResolvedValue(undefined);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post(`/api/education/topics/${UUID}/quiz/submit`)
      .set('Authorization', 'Bearer test')
      .send({ answers: { q1: 'A' } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ score: 80, level: 'HIGH' });
  });

  it('POST /api/education/topics/:id/quiz/submit → 400 when answers is not an object', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post(`/api/education/topics/${UUID}/quiz/submit`)
      .set('Authorization', 'Bearer test')
      .send({ answers: 'not-a-map' });
    expect(res.status).toBe(400);
  });
});
