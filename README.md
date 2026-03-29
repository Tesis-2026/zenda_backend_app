# Zenda Backend

REST API for Zenda built with NestJS 11, Prisma ORM, PostgreSQL 15, and JWT authentication.

---

## Stack

| Technology | Purpose |
|-----------|---------|
| NestJS 11 | API framework |
| Prisma ORM | Database access and migrations |
| PostgreSQL 15 | Primary database (via Docker) |
| JWT | Authentication (own implementation, no Firebase) |
| class-validator | DTO validation |
| Swagger / OpenAPI | API documentation |
| Helmet | Security headers |
| ThrottlerModule | Rate limiting |

---

## Setup

### 1. Environment Variables

```bash
cp .env.example .env
```

Fill in all required values. See `SETUP.md` at the root for the full variable reference.

### 2. Start the Database

```bash
docker compose up -d
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Migrations

```bash
npm run prisma:migrate
```

### 5. Seed Default Data

Loads system categories, challenges, badges, educational topics, and survey records:

```bash
npm run prisma:seed
```

### 6. Start in Development Mode

```bash
npm run start:dev
```

- API base URL: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/api/health`

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with watch mode |
| `npm run build` | Compile TypeScript |
| `npm run prisma:migrate` | Run pending migrations |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:seed` | Seed default data |

---

## API Endpoints (Current)

All endpoints require `Authorization: Bearer <token>` except `/auth/*`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (`{ status, version, timestamp }`) |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/me` | Update profile |
| `POST` | `/api/transactions` | Create transaction |
| `GET` | `/api/transactions` | List transactions with filters |
| `DELETE` | `/api/transactions/:id` | Soft-delete transaction |
| `POST` | `/api/categories` | Create custom category |
| `GET` | `/api/categories` | List system + custom categories |
| `DELETE` | `/api/categories/:id` | Soft-delete custom category |
| `POST` | `/api/goals` | Create savings goal |
| `GET` | `/api/goals` | List savings goals |
| `POST` | `/api/goals/:id/contribute` | Contribute to a goal |
| `DELETE` | `/api/goals/:id` | Soft-delete goal |
| `GET` | `/api/summary/month` | Monthly financial summary |

---

## Architecture

All business modules live in `src/modules/`. Each module follows the NestJS pattern:

```
src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
└── dto/
    ├── create-<name>.dto.ts
    ├── <name>.response.dto.ts
    └── ...
```

Common infrastructure:
- `src/common/exceptions/` — global exception filter
- `src/common/guards/` — JWT auth guard
- `src/common/decorators/` — `@UserId()` decorator
- `src/common/logger/` — request logging interceptor
- `src/infra/prisma/` — Prisma module
- `src/infra/ai/` — AI provider (stub, Phase 8)
- `src/health/` — health check endpoint

---

## Security

- All routes except `/api/auth/*` require a valid JWT
- JWT signed with `JWT_SECRET`, expires in 30 days
- Passwords hashed with bcrypt (cost factor 12)
- All user data scoped by `userId` from JWT payload
- Soft deletes on all entities (`deletedAt` field)
- Helmet security headers enabled
- CORS restricted to localhost in development

---

See [`../SETUP.md`](../SETUP.md) for full environment setup instructions.
