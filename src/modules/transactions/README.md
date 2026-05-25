# transactions

Money-movement bounded context: create / read / update / delete transactions with optional AI-assisted category classification.

## User stories

- US-0501 — Record an expense or income
- US-0502 — Edit a recorded transaction
- US-0503 — Delete a recorded transaction (soft)
- US-0504 — List transactions with filters (type, date range, category, search)
- US-0702 — AI suggests a category from a free-text description (US-0702)
- US-016 — Anomaly alert when a single expense is >20% over the user's 3-month category average
- US-AI-track — Track which transactions came from AI suggestions (`categorySource` enum) for the >=80% accuracy KPI

## Public surface (HTTP)

| Method | Path | Auth | Throttle (per minute) | Description |
|--------|------|------|----------------------|-------------|
| POST | `/transactions/classify` | JWT | 30 | AI-classify a description; returns suggested category + confidence |
| POST | `/transactions` | JWT | 60 | Create a transaction. Supports `Idempotency-Key` header (B28). |
| GET | `/transactions` | JWT | (global) | List with filters: `type`, `from`, `to`, `categoryId`, `minAmount`, `maxAmount`, `search`, `sort`, `skip`, `take` (max 100) |
| GET | `/transactions/:id` | JWT | (global) | Get one transaction by id |
| PUT | `/transactions/:id` | JWT | (global) | Update a transaction. Re-derives `categorySource` to flip AI → AI_OVERRIDDEN on user category change. |
| DELETE | `/transactions/:id` | JWT | (global) | Soft delete |

For full request/response shapes see Swagger at `/api/docs` (tag: `Transactions`).

## Domain

### Entities

- `TransactionEntity` — invariants: `occurredAt <= now`, `amount > 0`. Carries the AI-tracking triplet: `suggestedCategoryId`, `aiConfidence` (0..1), `categorySource` (`AI` / `AI_OVERRIDDEN` / `USER`).

### Enums

- `TransactionType` — `INCOME` / `EXPENSE`. Mirrors Prisma enum.
- `CategorySource` — `AI` (suggestion accepted), `AI_OVERRIDDEN` (suggestion shown but user picked another), `USER` (no AI involved). Derived from `(suggestedCategoryId, finalCategoryId)` via `deriveCategorySource()`.

### Ports (abstract repositories)

- `ITransactionRepository`
  - `create(...)` — INSERT with FK to category. Returns the row joined with category.
  - `findAll(userId, filters)` — paginated + filterable.
  - `findById(id, userId)` / `findByIdWithCategory(id, userId)` — both filter `deletedAt: null` and `userId` (multi-tenant safety).
  - `update(id, userId, params)` — partial update; preserves the original `suggestedCategoryId` so `categorySource` can be re-derived if the user changes the category later.
  - `softDelete(id)`
  - `hasConsecutiveDays(userId, days)` — used to award the "Consistency" badge.

## Use cases (`application/use-cases/`)

| Use case | Purpose | Audit event (B27) |
|----------|---------|-------------------|
| `CreateTransactionUseCase` | Validate inputs (occurredAt, AI-pair coherence), resolve category, derive `categorySource`, persist, award badges, verify challenges | `CREATE_TRANSACTION` (afterJson: type/amount/currency/categoryId/categorySource/occurredAt) |
| `UpdateTransactionUseCase` | Validate, re-resolve category if changed, re-derive `categorySource` against preserved suggestion, persist | `UPDATE_TRANSACTION` (before+after for diffable fields) |
| `DeleteTransactionUseCase` | Verify ownership, soft delete | `DELETE_TRANSACTION` (beforeJson: snapshot at delete time) |
| `GetTransactionUseCase` | Read single | — |
| `ListTransactionsUseCase` | Read many with filters | — |

## Persistence (`infrastructure/persistence/`)

- `PrismaTransactionRepository` — Decimal→number at the boundary. All write paths preserve `suggestedCategoryId` so `categorySource` derivation is monotonic. List queries use the `(userId, type, occurredAt)` index.

## Cross-context dependencies

- `IBadgeRepository` (from `badges/`) — `awardIfNotEarned` for First Transaction + Consistency.
- `VerifyChallengesUseCase` (from `challenges/`) — runs on every create; failures are swallowed (`catch(() => [])`) so a broken challenge does not fail a transaction write.
- `ResolveCategoryUseCase` (from `categories/`) — handles existing-id-or-new-name pattern.
- `SpendingAlertService` (from `infra/spending-alert/`) — called from the controller (not the use case) to compute the anomaly hint.
- `AiProvider` (from `infra/ai/`) — wired into the controller for the `/classify` route.
- `AuditLogService` (from `shared/audit/`) — recorded after every mutation.

**Anti-pattern flag:** direct imports of `BadgesModule` and `ChallengesModule` from `transactions.module.ts`. ACL facades will replace these in B19 (ARCH-17).

## Audit events (B27)

| Action | Status | Resource | Trigger |
|--------|--------|----------|---------|
| `CREATE_TRANSACTION` | SUCCESS | Transaction | Successful insert |
| `UPDATE_TRANSACTION` | SUCCESS | Transaction | Successful update (with before+after snapshot) |
| `DELETE_TRANSACTION` | SUCCESS | Transaction | Successful soft delete (with before snapshot) |

## Cross-cutting behavior

- **Soft delete:** yes. Every read query filters `deletedAt: null`.
- **Idempotency-Key:** supported via the global `IdempotencyInterceptor` (B28) on POST `/transactions`. Recommended for mobile clients with offline queues.
- **Rate limiting:** POST `/transactions` 60/min, POST `/transactions/classify` 30/min (AI-backed, more expensive).
- **AI-tracking:** every create persists the triplet `(suggestedCategoryId, aiConfidence, categorySource)` so the >=80% prediction-accuracy KPI can be measured retrospectively.
- **Sensitive boundary:** `Decimal` → `number` is acceptable here because `@db.Decimal(12, 2)` fits IEEE 754 without loss for realistic financial amounts.

## Open items

- **B19** (⚪ pending) — replace direct `BadgesModule` / `ChallengesModule` imports with ACL facades.
- **B10** (⚪ pending — frontend) — frontend `TransactionModel` doesn't yet parse `suggestedCategoryId` / `aiConfidence` / `categorySource` from responses (ARCH-11).
