import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, NOW_DATE } from '../fixtures';
import { GetActiveConversationUseCase } from '../../src/modules/conversations/application/use-cases/get-active-conversation.use-case';
import { SendChatMessageUseCase } from '../../src/modules/conversations/application/use-cases/send-chat-message.use-case';
import { CloseActiveConversationUseCase } from '../../src/modules/conversations/application/use-cases/close-active-conversation.use-case';

describe('AI Chat / Conversations (contract — mocked, no DB)', () => {
  let app: INestApplication;
  const getActive = { execute: jest.fn() };
  const sendMessage = { execute: jest.fn() };
  const closeActive = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: GetActiveConversationUseCase, useValue: getActive },
        { provide: SendChatMessageUseCase, useValue: sendMessage },
        { provide: CloseActiveConversationUseCase, useValue: closeActive },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/ai/chat/active without a token → 401', async () => {
    ({ app } = await createTestApp());
    expect((await request(app.getHttpServer()).get('/api/ai/chat/active')).status).toBe(401);
  });

  it('GET /api/ai/chat/active → 200 with {conversationId, messages[]}', async () => {
    getActive.execute.mockResolvedValue({
      id: 'conv-1',
      messages: [
        { id: 'm1', role: 'user', content: '¿Cómo ahorro?', createdAt: NOW_DATE },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Empieza con la regla 50/30/20 [3:04_ahorro_y_metas_financieras.md].',
          createdAt: NOW_DATE,
        },
      ],
    });
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/ai/chat/active')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ conversationId: 'conv-1' });
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0]).toMatchObject({ role: 'user', content: expect.any(String) });
    expect(res.body.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Empieza con la regla 50/30/20.',
    });
    // createdAt is serialized to an ISO-8601 string in the response DTO.
    expect(typeof res.body.messages[0].createdAt).toBe('string');
  });

  it('GET /api/ai/chat/active → 200 with null conversationId when none active', async () => {
    getActive.execute.mockResolvedValue(null);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/ai/chat/active')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ conversationId: null, messages: [] });
  });

  it('POST /api/ai/chat → 201 with {conversationId, reply}', async () => {
    sendMessage.execute.mockResolvedValue({
      conversationId: 'conv-1',
      reply: 'Claro, te explico.',
      answer: 'Claro, te explico.',
      sources: [],
      metadata: { agent: 'ZENDA', usedRag: true },
    });
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer test')
      .send({ userId: fixtureUser.sub, message: '¿Cómo armo un presupuesto?' });
    // POST has no @HttpCode override → Nest's default 201 (the @ApiOk(200) is Swagger-only).
    expect(res.status).toBe(201);
    expect(sendMessage.execute).toHaveBeenCalledWith(fixtureUser.sub, '¿Cómo armo un presupuesto?');
    expect(res.body).toMatchObject({
      conversationId: 'conv-1',
      reply: expect.any(String),
      answer: expect.any(String),
      sources: [],
      metadata: { agent: 'ZENDA', usedRag: true },
    });
  });

  it('POST /api/ai/chat → 403 when body userId does not match JWT user', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer test')
      .send({ userId: 'another-user', message: '¿Cómo armo un presupuesto?' });
    expect(res.status).toBe(403);
    expect(sendMessage.execute).not.toHaveBeenCalled();
  });

  it('POST /api/ai/chat → 400 when message is empty', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer test')
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/chat/close → 204', async () => {
    closeActive.execute.mockResolvedValue(undefined);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat/close')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(204);
  });
});
