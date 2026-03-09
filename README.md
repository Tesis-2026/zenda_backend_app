# ZENDA Backend (MVP 1)

Backend API para ZENDA con NestJS, Prisma, PostgreSQL y JWT.

## Stack

- NestJS (TypeScript)
- Prisma ORM
- PostgreSQL (Docker)
- JWT Auth propio
- class-validator
- Swagger

## Variables de entorno

Usa `.env.example` como base para crear `.env`.

Variables clave:

- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `PORT`
- `NODE_ENV`
- `APP_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `BCRYPT_ROUNDS`

## Puesta en marcha

1. Levantar base de datos

```bash
docker compose up -d
```

2. Ejecutar migraciones Prisma

```bash
npx prisma migrate dev
```

3. Cargar categorías globales del sistema

```bash
npm run prisma:seed
```

4. Levantar backend en modo desarrollo

```bash
npm run start:dev
```

5. Abrir Swagger

- `http://localhost:3000/api/docs`

## Scripts

- `npm run start:dev`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Endpoints principales MVP

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/transactions`
- `GET /api/transactions`
- `DELETE /api/transactions/:id`
- `POST /api/categories`
- `GET /api/categories`
- `DELETE /api/categories/:id`
- `POST /api/goals`
- `GET /api/goals`
- `POST /api/goals/:id/contribute`
- `DELETE /api/goals/:id`
- `GET /api/summary/month?year=YYYY&month=MM`

Todos los endpoints de negocio usan scope por `userId` del token JWT y filtran `deletedAt = null`.
