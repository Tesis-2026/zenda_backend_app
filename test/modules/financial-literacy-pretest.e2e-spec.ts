import { BadRequestException, ConflictException, INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from '../support/create-test-app';
import { fixtureUser } from '../fixtures';
import {
  FINANCIAL_LITERACY_CONSENT_VERSION,
  FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
  FINANCIAL_LITERACY_QUESTIONS,
  getPublicFinancialLiteracyQuestions,
  scoreFinancialLiteracyAnswers,
} from '../../src/modules/surveys/domain/financial-literacy-questions';
import { FinancialLiteracyAssessmentService } from '../../src/modules/surveys/application/financial-literacy-assessment.service';
import { AssessmentStatus, AssessmentType } from '@prisma/client';

describe('Financial Literacy Pre-Test (US-1201 / FINLIT_PRE_V1) — 18 Pruebas Obligatorias', () => {
  let app: INestApplication;
  let prisma: any;
  let service: FinancialLiteracyAssessmentService;

  const mockUserA = {
    ...fixtureUser,
    id: 'user-aaa-1111-1111-111111111111',
    email: 'fernando.academic@universidad.edu.pe',
    fullName: 'Fernando Alumno',
  };

  const mockUserB = {
    ...fixtureUser,
    id: 'user-bbb-2222-2222-222222222222',
    email: 'maria.estudiante@universidad.edu.pe',
    fullName: 'Maria Gomez',
  };

  // 12 all-correct answers
  const allCorrectAnswers: Record<string, string> = {
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

  // 12 all-incorrect answers
  const allIncorrectAnswers: Record<string, string> = {
    Q1: 'A',
    Q2: 'A',
    Q3: 'B',
    Q4: 'A',
    Q5: 'A',
    Q6: 'A',
    Q7: 'A',
    Q8: 'A',
    Q9: 'A',
    Q10: 'A',
    Q11: 'A',
    Q12: 'A',
  };

  // 8 correct, 4 incorrect
  const eightCorrectAnswers: Record<string, string> = {
    ...allCorrectAnswers,
    Q1: 'A', // wrong
    Q2: 'A', // wrong
    Q3: 'B', // wrong
    Q4: 'A', // wrong
  };

  // In-memory data store for isolated service/e2e behavior
  let participantsStore: Map<string, any>;
  let assessmentsStore: Map<string, any>;
  let answersStore: Map<string, any>;

  beforeEach(async () => {
    participantsStore = new Map();
    assessmentsStore = new Map();
    answersStore = new Map();

    ({ app, prisma } = await createTestApp({
      user: { sub: mockUserA.id, email: mockUserA.email },
    }));

    service = app.get(FinancialLiteracyAssessmentService);

    // Wire in-memory mock repository behavior for stateful lifecycle testing
    prisma.researchParticipant.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.userId) {
        return participantsStore.get(where.userId) ?? null;
      }
      if (where.researchParticipantId) {
        for (const p of participantsStore.values()) {
          if (p.researchParticipantId === where.researchParticipantId) return p;
        }
      }
      return null;
    });

    prisma.researchParticipant.create.mockImplementation(async ({ data }: any) => {
      const record = { id: `part-${Date.now()}`, ...data, createdAt: new Date() };
      participantsStore.set(data.userId, record);
      return record;
    });

    prisma.financialLiteracyAssessment.findUnique.mockImplementation(
      async ({ where }: any) => {
        if (where.id) return assessmentsStore.get(where.id) ?? null;
        if (where.researchParticipantId_assessmentType_questionnaireVersion) {
          const { researchParticipantId, assessmentType, questionnaireVersion } =
            where.researchParticipantId_assessmentType_questionnaireVersion;
          const key = `${researchParticipantId}:${assessmentType}:${questionnaireVersion}`;
          const found = assessmentsStore.get(key);
          if (found) {
            // attach answers
            const answers = Array.from(answersStore.values()).filter(
              (ans) => ans.assessmentId === found.id,
            );
            return { ...found, answers };
          }
          return null;
        }
        return null;
      },
    );

    prisma.financialLiteracyAssessment.create.mockImplementation(async ({ data }: any) => {
      const id = `assess-${Math.random().toString(36).slice(2, 9)}`;
      const key = `${data.researchParticipantId}:${data.assessmentType}:${data.questionnaireVersion}`;
      const record = { id, ...data, answers: [] };
      assessmentsStore.set(key, record);
      assessmentsStore.set(id, record);
      return record;
    });

    prisma.financialLiteracyAssessment.update.mockImplementation(
      async ({ where, data }: any) => {
        const existing = assessmentsStore.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        const key = `${updated.researchParticipantId}:${updated.assessmentType}:${updated.questionnaireVersion}`;
        assessmentsStore.set(key, updated);
        assessmentsStore.set(where.id, updated);
        return updated;
      },
    );

    prisma.financialLiteracyAssessment.findMany.mockImplementation(async () => {
      // Return distinct assessments by id
      const unique = Array.from(
        new Map(
          Array.from(assessmentsStore.values()).map((item) => [item.id, item]),
        ).values(),
      );
      return unique.map((a) => ({
        ...a,
        answers: Array.from(answersStore.values()).filter((ans) => ans.assessmentId === a.id),
      }));
    });

    prisma.financialLiteracyAnswer.upsert.mockImplementation(
      async ({ where, create, update }: any) => {
        const { assessmentId, questionId } = where.assessmentId_questionId;
        const key = `${assessmentId}:${questionId}`;
        const existing = answersStore.get(key);
        if (existing) {
          const updated = { ...existing, ...update };
          answersStore.set(key, updated);
          return updated;
        }
        const created = { id: `ans-${Math.random()}`, ...create };
        answersStore.set(key, created);
        return created;
      },
    );

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: mockUserA.id,
      financialLiteracyLevel: 'LOW',
      profileCompleted: false,
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 1: Nuevo usuario obtiene researchParticipantId
  // ──────────────────────────────────────────────────────────────────────────
  it('1. Nuevo usuario obtiene researchParticipantId (UUID v4 válido generado server-side)', async () => {
    const participant = await service.getOrCreateParticipant(mockUserA.id);

    expect(participant).toBeDefined();
    expect(participant.researchParticipantId).toBeDefined();
    // Valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(participant.researchParticipantId).toMatch(uuidRegex);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 2: Dos usuarios nunca reciben el mismo researchParticipantId
  // ──────────────────────────────────────────────────────────────────────────
  it('2. Dos usuarios nunca reciben el mismo researchParticipantId', async () => {
    const participantA = await service.getOrCreateParticipant(mockUserA.id);
    const participantB = await service.getOrCreateParticipant(mockUserB.id);

    expect(participantA.researchParticipantId).not.toBe(
      participantB.researchParticipantId,
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 3: researchParticipantId no contiene información derivada del email
  // ──────────────────────────────────────────────────────────────────────────
  it('3. researchParticipantId no contiene información derivada del email ni nombre', async () => {
    const participant = await service.getOrCreateParticipant(mockUserA.id);
    const id = participant.researchParticipantId.toLowerCase();

    // Not containing parts of email or name
    expect(id).not.toContain('fernando');
    expect(id).not.toContain('academic');
    expect(id).not.toContain('universidad');
    expect(id).not.toContain('alumno');

    // Not an MD5 or SHA256 of the email
    const crypto = require('crypto');
    const md5 = crypto.createHash('md5').update(mockUserA.email).digest('hex');
    const sha = crypto.createHash('sha256').update(mockUserA.email).digest('hex');
    expect(id).not.toBe(md5);
    expect(id).not.toBe(sha);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 4: PRE puede iniciarse una única vez
  // ──────────────────────────────────────────────────────────────────────────
  it('4. PRE puede iniciarse una única vez (rechaza iniciar si ya está COMPLETED)', async () => {
    // Start once
    const started = await service.startAssessment(mockUserA.id, {
      consentGiven: true,
      consentVersion: FINANCIAL_LITERACY_CONSENT_VERSION,
    });
    expect(started.status).toBe(AssessmentStatus.IN_PROGRESS);

    // Complete the assessment
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });

    // Trying to start again must throw ConflictException
    await expect(
      service.startAssessment(mockUserA.id, {
        consentGiven: true,
        consentVersion: FINANCIAL_LITERACY_CONSENT_VERSION,
      }),
    ).rejects.toThrow(ConflictException);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 5: PRE IN_PROGRESS puede reanudarse
  // ──────────────────────────────────────────────────────────────────────────
  it('5. PRE IN_PROGRESS puede reanudarse conservando respuestas previas', async () => {
    // Start assessment
    await service.startAssessment(mockUserA.id, {
      consentGiven: true,
      consentVersion: FINANCIAL_LITERACY_CONSENT_VERSION,
    });

    // Save partial answers (e.g. user answered 4 questions then closed app)
    await service.saveProgress(mockUserA.id, {
      answers: { Q1: 'B', Q2: 'B', Q3: 'A', Q4: 'C' },
    });

    // Resume / getStatus
    const status = await service.getStatus(mockUserA.id, AssessmentType.PRE);
    expect(status.status).toBe(AssessmentStatus.IN_PROGRESS);
    expect(status.answeredQuestions).toEqual({
      Q1: 'B',
      Q2: 'B',
      Q3: 'A',
      Q4: 'C',
    });
    expect(status.totalAnswered).toBe(4);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 6: PRE COMPLETED no puede volver a modificarse
  // ──────────────────────────────────────────────────────────────────────────
  it('6. PRE COMPLETED no puede volver a modificarse', async () => {
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });

    // Trying to saveProgress on completed assessment
    await expect(
      service.saveProgress(mockUserA.id, { answers: { Q1: 'A' } }),
    ).rejects.toThrow(ConflictException);

    // Trying to submit again
    await expect(
      service.submitAssessment(mockUserA.id, { answers: allIncorrectAnswers }),
    ).rejects.toThrow(ConflictException);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 7: No se puede completar con menos de 12 respuestas
  // ──────────────────────────────────────────────────────────────────────────
  it('7. No se puede completar con menos de 12 respuestas', async () => {
    const incompleteAnswers = { ...allCorrectAnswers };
    delete incompleteAnswers.Q12; // only 11 answers

    await expect(
      service.submitAssessment(mockUserA.id, { answers: incompleteAnswers }),
    ).rejects.toThrow(BadRequestException);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 8: No se puede responder dos veces la misma pregunta
  // ──────────────────────────────────────────────────────────────────────────
  it('8. No se puede duplicar una respuesta (cada pregunta se almacena una sola vez por evaluación)', async () => {
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });

    const participant = await service.getOrCreateParticipant(mockUserA.id);
    const assessment = await prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType: AssessmentType.PRE,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
      include: { answers: true },
    });

    expect(assessment.answers).toHaveLength(12);
    const questionIds = assessment.answers.map((a: any) => a.questionId);
    const uniqueIds = new Set(questionIds);
    expect(uniqueIds.size).toBe(12);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 9: No se aceptan questionIds inexistentes
  // ──────────────────────────────────────────────────────────────────────────
  it('9. No se aceptan questionIds inexistentes', async () => {
    const invalidQuestionAnswers = {
      ...allCorrectAnswers,
      Q99: 'A', // invalid ID
    };
    delete invalidQuestionAnswers.Q12;

    await expect(
      service.submitAssessment(mockUserA.id, { answers: invalidQuestionAnswers }),
    ).rejects.toThrow(BadRequestException);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 10: Backend calcula correctamente score 0–12
  // ──────────────────────────────────────────────────────────────────────────
  it('10. Backend calcula correctamente score 0–12', () => {
    // 12/12
    const score12 = scoreFinancialLiteracyAnswers(allCorrectAnswers);
    expect(score12.totalScore).toBe(12);
    expect(score12.maxScore).toBe(12);

    // 0/12
    const score0 = scoreFinancialLiteracyAnswers(allIncorrectAnswers);
    expect(score0.totalScore).toBe(0);

    // 8/12
    const score8 = scoreFinancialLiteracyAnswers(eightCorrectAnswers);
    expect(score8.totalScore).toBe(8);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 11: El frontend nunca recibe correctAnswer
  // ──────────────────────────────────────────────────────────────────────────
  it('11. El frontend nunca recibe correctAnswer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/surveys/pre')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(12);

    for (const q of res.body.questions) {
      expect(q).not.toHaveProperty('correctAnswer');
      expect(q).not.toHaveProperty('scoreValue');
      expect(q).toHaveProperty('questionId');
      expect(q).toHaveProperty('questionText');
      expect(q).toHaveProperty('domain');
      expect(q).toHaveProperty('options');
      expect(q).toHaveProperty('order');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 12: Un usuario no puede enviar respuestas utilizando el identificador de otro
  // ──────────────────────────────────────────────────────────────────────────
  it('12. Un usuario no puede enviar respuestas utilizando el identificador de otro', async () => {
    const participantB = await service.getOrCreateParticipant(mockUserB.id);

    // User A attempts to inject researchParticipantId of User B in payload
    await request(app.getHttpServer())
      .post('/api/surveys/pre/response')
      .set('Authorization', 'Bearer test')
      .send({
        researchParticipantId: participantB.researchParticipantId, // spoof attempt
        answers: allCorrectAnswers,
      });

    // Participant B must have 0 assessments completed!
    const participantBAssessment =
      await prisma.financialLiteracyAssessment.findUnique({
        where: {
          researchParticipantId_assessmentType_questionnaireVersion: {
            researchParticipantId: participantB.researchParticipantId,
            assessmentType: AssessmentType.PRE,
            questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
          },
        },
      });

    expect(participantBAssessment).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 13: La exportación de investigación no contiene email
  // ──────────────────────────────────────────────────────────────────────────
  it('13. La exportación de investigación no contiene email', async () => {
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });
    const rows = await service.exportPseudonymizedResearchDataset();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).not.toHaveProperty('email');
      expect(JSON.stringify(row)).not.toContain('fernando.academic@universidad.edu.pe');
      expect(JSON.stringify(row)).not.toContain('@');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 14: La exportación no contiene nombre
  // ──────────────────────────────────────────────────────────────────────────
  it('14. La exportación no contiene nombre', async () => {
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });
    const rows = await service.exportPseudonymizedResearchDataset();

    for (const row of rows) {
      expect(row).not.toHaveProperty('fullName');
      expect(row).not.toHaveProperty('name');
      expect(JSON.stringify(row)).not.toContain('Fernando');
      expect(JSON.stringify(row)).not.toContain('Alumno');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 15: La exportación no contiene tokens
  // ──────────────────────────────────────────────────────────────────────────
  it('15. La exportación no contiene tokens', async () => {
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });
    const rows = await service.exportPseudonymizedResearchDataset();

    for (const row of rows) {
      expect(row).not.toHaveProperty('token');
      expect(row).not.toHaveProperty('accessToken');
      expect(row).not.toHaveProperty('refreshToken');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 16: La exportación no contiene IP/deviceId
  // ──────────────────────────────────────────────────────────────────────────
  it('16. La exportación no contiene IP/deviceId', async () => {
    await service.submitAssessment(mockUserA.id, { answers: allCorrectAnswers });
    const rows = await service.exportPseudonymizedResearchDataset();

    for (const row of rows) {
      expect(row).not.toHaveProperty('ip');
      expect(row).not.toHaveProperty('ipAddress');
      expect(row).not.toHaveProperty('deviceId');
      expect(row).not.toHaveProperty('userAgent');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 17: PRE y POST pueden coexistir para el mismo participantId
  // ──────────────────────────────────────────────────────────────────────────
  it('17. PRE y POST pueden coexistir para el mismo participantId', async () => {
    // Submit PRE
    await service.submitAssessment(
      mockUserA.id,
      { answers: eightCorrectAnswers },
      AssessmentType.PRE,
    );

    // Submit POST
    await service.submitAssessment(
      mockUserA.id,
      { answers: allCorrectAnswers },
      AssessmentType.POST,
    );

    const participant = await service.getOrCreateParticipant(mockUserA.id);

    const pre = await prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType: AssessmentType.PRE,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
    });

    const post = await prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType: AssessmentType.POST,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
    });

    expect(pre).toBeDefined();
    expect(post).toBeDefined();
    expect(pre.totalScore).toBe(8);
    expect(post.totalScore).toBe(12);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 18: El POST nunca modifica los registros PRE
  // ──────────────────────────────────────────────────────────────────────────
  it('18. El POST nunca modifica los registros PRE', async () => {
    await service.submitAssessment(
      mockUserA.id,
      { answers: eightCorrectAnswers },
      AssessmentType.PRE,
    );

    const preBefore = await service.getStatus(mockUserA.id, AssessmentType.PRE);
    const preStartedAtBefore = preBefore.startedAt;

    // Execute POST with all 12 correct
    await service.submitAssessment(
      mockUserA.id,
      { answers: allCorrectAnswers },
      AssessmentType.POST,
    );

    const preAfter = await service.getStatus(mockUserA.id, AssessmentType.PRE);
    expect(preAfter.status).toBe(AssessmentStatus.COMPLETED);
    expect(preAfter.startedAt).toBe(preStartedAtBefore);

    const participant = await service.getOrCreateParticipant(mockUserA.id);
    const preRecord = await prisma.financialLiteracyAssessment.findUnique({
      where: {
        researchParticipantId_assessmentType_questionnaireVersion: {
          researchParticipantId: participant.researchParticipantId,
          assessmentType: AssessmentType.PRE,
          questionnaireVersion: FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION,
        },
      },
    });

    expect(preRecord.totalScore).toBe(8); // Still 8! Unchanged by POST!
  });
});
