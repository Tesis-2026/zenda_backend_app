import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp } from '../support/create-test-app';
import { fixtureUser, makeCategory } from '../fixtures';
import { CreateCategoryUseCase } from '../../src/modules/categories/application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from '../../src/modules/categories/application/use-cases/list-categories.use-case';

describe('Categories (contract — mocked use cases, no DB)', () => {
  let app: INestApplication;
  const list = { execute: jest.fn() };
  const create = { execute: jest.fn() };

  async function bootAuthed() {
    ({ app } = await createTestApp({
      user: fixtureUser,
      overrides: [
        { provide: ListCategoriesUseCase, useValue: list },
        { provide: CreateCategoryUseCase, useValue: create },
      ],
    }));
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('GET /api/categories without a token → 401', async () => {
    ({ app } = await createTestApp());
    const res = await request(app.getHttpServer()).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('GET /api/categories → 200 with the CategoryModel shape', async () => {
    list.execute.mockResolvedValue([makeCategory(), makeCategory({ id: 'c2', name: 'Ahorro', transactionType: null })]);
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 'cat-1',
      name: 'Comida',
      type: 'SYSTEM',
      transactionType: 'EXPENSE',
      // System categories carry a stable semantic icon key the client maps.
      icon: 'food',
    });
  });

  it('POST /api/categories (valid) → 201; custom category has null icon', async () => {
    create.execute.mockResolvedValue(
      makeCategory({ id: 'c9', name: 'Mascotas', type: 'CUSTOM', transactionType: null, icon: null }),
    );
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Mascotas' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Mascotas', type: 'CUSTOM' });
    // Custom categories get no icon key — the client renders a single default.
    expect(res.body.icon).toBeNull();
  });

  it('POST /api/categories (empty name) → 400', async () => {
    await bootAuthed();
    const res = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });
});
