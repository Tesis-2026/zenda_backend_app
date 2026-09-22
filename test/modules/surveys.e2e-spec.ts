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

  const valid12Answers = {
    Q1: 'B',
    Q2: 'B',
    Q3: 'A',
    Q4: 'C',
    Q5: 'C',
    Q6: 'B',
    Q7: 'C',
    Q8: 'B',
    Q9: 'B',
    Q10: 'B',
    Q11: 'C',
    Q12: 'B',
  };

  it('GET /api/surveys/pre → 200 with {id, type, questions[]} containing 12 items without correctAnswer', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/surveys/pre')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: 'PRE',
      assessmentType: 'PRE',
      questionnaireVersion: 'FINLIT_PRE_V1',
    });
    expect(res.body.questions).toHaveLength(12);
    expect(res.body.questions[0]).toMatchObject({
      id: 'Q1',
      questionId: 'Q1',
      order: 1,
      domain: 'PLANIFICACION',
    });
    // The answer key is never leaked to the client.
    expect(res.body.questions[0]).not.toHaveProperty('correctAnswer');
    expect(res.body.questions[0]).not.toHaveProperty('scoreValue');
  });

  it('POST /api/surveys/pre/response → 201 with completion message; updates literacy level', async () => {
    await bootAuthed();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: fixtureUser.id,
      financialLiteracyLevel: 'LOW',
      profileCompleted: false,
    });
    const res = await request(app.getHttpServer())
      .post('/api/surveys/pre/response')
      .set('Authorization', 'Bearer test')
      .send({ answers: valid12Answers });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      completed: true,
      assessmentType: 'PRE',
      questionnaireVersion: 'FINLIT_PRE_V1',
    });
    expect(prisma.financialLiteracyAssessment.create).toHaveBeenCalled();
  });

  it('POST /api/surveys/pre/response → 409 when already submitted', async () => {
    await bootAuthed();
    prisma.financialLiteracyAssessment.findUnique.mockResolvedValue({
      id: 'assess-completed-1',
      researchParticipantId: 'rp-1',
      assessmentType: 'PRE',
      questionnaireVersion: 'FINLIT_PRE_V1',
      status: 'COMPLETED',
      totalScore: 12,
    });
    const res = await request(app.getHttpServer())
      .post('/api/surveys/pre/response')
      .set('Authorization', 'Bearer test')
      .send({ answers: valid12Answers });
    expect(res.status).toBe(409);
  });

  it('POST /api/surveys/sus/response → 201 with {susScore, grade}', async () => {
    await bootAuthed();
    prisma.survey.findFirst.mockResolvedValue(
      makeSurvey('SUS', {
        questionsJson: Array.from({ length: 10 }, (_, i) => ({
          id: `sq${i + 1}`,
          order: i + 1,
          text: `Synthetic ${i + 1}`,
          options: ['1', '2', '3', '4', '5'],
          correctAnswer: null,
        })),
      }),
    );
    prisma.surveyResponse.findUnique.mockResolvedValue(null);
    const res = await request(app.getHttpServer())
      .post('/api/surveys/sus/response')
      .set('Authorization', 'Bearer test')
      .send({
        answers: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [
            `sq${i + 1}`,
            i === 0 ? '4' : i % 2 === 0 ? '5' : '1',
          ]),
        ),
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('susScore');
    expect(res.body).toHaveProperty('grade');
    expect(typeof res.body.susScore).toBe('number');
    expect(res.body.susScore).toBe(97.5);
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
