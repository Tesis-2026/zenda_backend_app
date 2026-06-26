import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeSurvey } from '../fixtures';

/**
 * Surveys read/write straight through PrismaService (no use-case layer), so
 * these tests stub the Prisma model methods on the shared mock returned by
 * createTestApp instead of overriding a use case.
 */
describe('Surveys (contract — mocked, no DB)', () => {
  let app: INestApplication;
  let prisma: any;

  async function bootAuthed() {
    ({ app, prisma } = await createTestApp({ user: fixtureUser }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/surveys/pre without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect(
      (await request(app.getHttpServer()).get('/api/surveys/pre')).status,
    ).toBe(401);
  });

  it('GET /api/surveys/pre → 404 when the pre-survey is not seeded', async () => {
    await bootAuthed();
    // prisma.survey.findFirst defaults to null → NotFoundException
    const res = await request(app.getHttpServer())
      .get('/api/surveys/pre')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(404);
  });

  it('GET /api/surveys/pre → 200 with {id, type, questions[]}', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(makeSurvey('PRE'));
    const res = await request(app.getHttpServer())
      .get('/api/surveys/pre')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'PRE' });
    expect(res.body.questions).toHaveLength(2);
    expect(res.body.questions[0]).toMatchObject({
      id: 'sq1',
      order: 1,
      text: expect.any(String),
    });
    // The answer key is never leaked to the client.
    expect(res.body.questions[0]).not.toHaveProperty('correctAnswer');
  });

  it('POST /api/surveys/pre/response → 201 with {score, level}; updates literacy level', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(makeSurvey('PRE'));
    prisma.surveyResponse.findUnique.mockResolvedValue(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      financialLiteracyLevel: 'LOW',
      profileCompleted: false,
    });
    const res = await request(app.getHttpServer())
      .post('/api/surveys/pre/response')
      .set('Authorization', 'Bearer test')
      .send({ answers: { sq1: 'Sí', sq2: 'Sí' } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ score: 100, level: 'HIGH' });
    expect(prisma.surveyResponse.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('POST /api/surveys/pre/response → 409 when already submitted', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(makeSurvey('PRE'));
    prisma.surveyResponse.findUnique.mockResolvedValue({ id: 'resp-1' });
    const res = await request(app.getHttpServer())
      .post('/api/surveys/pre/response')
      .set('Authorization', 'Bearer test')
      .send({ answers: { sq1: 'Sí', sq2: 'Sí' } });
    expect(res.status).toBe(409);
  });

  it('POST /api/surveys/sus/response → 201 with {susScore, grade}', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(makeSurvey('SUS'));
    prisma.surveyResponse.findUnique.mockResolvedValue(null);
    const res = await request(app.getHttpServer())
      .post('/api/surveys/sus/response')
      .set('Authorization', 'Bearer test')
      .send({ answers: { sq1: '5', sq2: '1' } });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('susScore');
    expect(res.body).toHaveProperty('grade');
    expect(typeof res.body.susScore).toBe('number');
  });

  it('GET /api/surveys/satisfaction → 200 with Likert and open questions', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(
      makeSurvey('SATISFACTION', {
        questionsJson: [
          {
            id: 'sat1',
            order: 1,
            text: 'La app me ayudó a entender mejor mis gastos.',
            options: ['1', '2', '3', '4', '5'],
            correctAnswer: null,
          },
          {
            id: 'sat8',
            order: 8,
            text: '¿Qué funcionalidad te ayudó más?',
            options: [],
            correctAnswer: null,
          },
        ],
      }),
    );

    const res = await request(app.getHttpServer())
      .get('/api/surveys/satisfaction')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'SATISFACTION' });
    expect(res.body.questions).toHaveLength(2);
    expect(res.body.questions[0].options).toEqual(['1', '2', '3', '4', '5']);
    expect(res.body.questions[1].options).toEqual([]);
  });

  it('POST /api/surveys/satisfaction/response → 201 with normalized score', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(
      makeSurvey('SATISFACTION', {
        questionsJson: [
          {
            id: 'sat1',
            order: 1,
            text: 'La app me ayudó a entender mejor mis gastos.',
            options: ['1', '2', '3', '4', '5'],
            correctAnswer: null,
          },
          {
            id: 'sat2',
            order: 2,
            text: 'El asistente IA fue claro.',
            options: ['1', '2', '3', '4', '5'],
            correctAnswer: null,
          },
          {
            id: 'sat8',
            order: 8,
            text: '¿Qué funcionalidad te ayudó más?',
            options: [],
            correctAnswer: null,
          },
        ],
      }),
    );
    prisma.surveyResponse.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/surveys/satisfaction/response')
      .set('Authorization', 'Bearer test')
      .send({ answers: { sat1: '5', sat2: '4', sat8: 'Chat IA' } });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      score: 88,
      averageLikert: 4.5,
      likertCount: 2,
    });
    expect(prisma.surveyResponse.create).toHaveBeenCalled();
  });

  it('GET /api/surveys/sus/status returns eligible after enough usage', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(makeSurvey('SUS'));
    prisma.surveyResponse.findUnique.mockResolvedValue(null);
    prisma.analyticsEvent.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.analyticsEvent.findFirst
      .mockResolvedValueOnce({
        createdAt: new Date('2026-05-28T12:00:00.000Z'),
      })
      .mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer())
      .get('/api/surveys/sus/status')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      completed: false,
      shouldPrompt: true,
      reason: 'eligible',
    });
    expect(res.body.metrics.sessionsCount).toBe(3);
  });

  it('GET /api/surveys/comparison → 200 with {preScore, postScore, improvementPercentage}', async () => {
    await bootAuthed();
    // No responses seeded → all null, but the contract shape must hold.
    const res = await request(app.getHttpServer())
      .get('/api/surveys/comparison')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      preScore: null,
      postScore: null,
      improvementPercentage: null,
    });
  });
});
