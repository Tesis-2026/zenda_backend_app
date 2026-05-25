# Modules — bounded contexts

Every folder here is a NestJS module that maps to exactly one DDD bounded context. Layer structure is fixed; cross-cutting infra goes in [`../infra/`](../infra/) and [`../shared/`](../shared/), not here.

## Per-module README template

Each `<module>/README.md` should follow this template so a reader can answer the same questions for every context without learning a new structure:

```markdown
# <Context name>

One-sentence purpose.

## User stories

- US-XXXX — short description
- ...

## Public surface (HTTP)

| Method | Path | Auth | Throttle | Description |
|--------|------|------|----------|-------------|
| ... |

For the full request/response shape, see Swagger at `/api/docs` (tag: `<Context name>`).

## Domain

### Entities

- `XxxEntity` — invariants and key methods.

### Enums

- `XxxEnum` — values + when each applies.

### Ports (abstract repositories)

- `IXxxRepository` — methods + what each guarantees.

## Use cases (`application/use-cases/`)

Each one is a class. List with a one-line purpose + the audit event it records (B27), if any.

## Persistence (`infrastructure/persistence/`)

- `PrismaXxxRepository` — implements `IXxxRepository`. Notes on Decimal handling, soft-delete filtering, etc.

## Cross-context dependencies

What other modules / facades this one depends on. Flag any direct repository import (anti-pattern; should be via ACL facade — see ARCH-17 / B19).

## Audit events (B27)

Actions recorded via `AuditLogService.record({ action, resource, ... })`:

- `XXXX_YYYY` (resource=`Resource`) — when and what fields.

## Cross-cutting behavior

- Soft delete: yes/no (which entities)
- Idempotency-Key support: yes/no
- Rate limiting: `@Throttle(...)` config
- Special error mapping: anything beyond the global Prisma mapping from B22

## Open items

Refactor batches that affect this module — link to the row in `docs/architecture-compliance-plan.md`.
```

## Module index

| Folder | Purpose | README |
|--------|---------|--------|
| `auth/` | Register, login, password reset, JWT, refresh tokens | [auth/README.md](auth/README.md) |
| `users/` | Profile read/update, notification preferences, account deletion | _pending_ |
| `categories/` | System + custom categories with soft delete | _pending_ |
| `transactions/` | CRUD + filters + AI classification + idempotent create | [transactions/README.md](transactions/README.md) |
| `budgets/` | Monthly budgets per category with progress tracking | _pending_ |
| `goals/` | Savings goals + contribute + complete | _pending_ |
| `insights/` | Day / week / month summaries + comparison + PDF export | _pending_ |
| `predictions/` | Expense prediction + accuracy check | _pending_ |
| `recommendations/` | AI recommendations with lifecycle + chat conversations | [recommendations/README.md](recommendations/README.md) |
| `education/` | Topics + per-topic quizzes + personalized quiz + surveys | _pending_ |
| `challenges/` | Challenge catalog + accept/complete | _pending_ |
| `badges/` | Badge catalog + awarding | _pending_ |
| `feedback/` | App feedback submission | _pending_ |
| `financial-progress/` | Monthly snapshot for obs. #9 correlation | _pending_ |
| `surveys/` | Reserved — current surveys logic lives in `education/` (B7 pending) | _pending_ |

> Adding READMEs for the remaining 12 modules is tracked as a follow-up. The 3 done here are the exemplars.
