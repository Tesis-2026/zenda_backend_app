# recommendations

AI advice bounded context. Two surfaces: (1) batch recommendations with a lifecycle (active / viewed / dismissed / feedback) and (2) a conversational AI chat (one active conversation per user, messages retained).

## User stories

- US-0901 — Personalized recommendations based on the user's spending
- US-0902 — Per-recommendation accept / reject feedback + acceptance rate
- US-AI-chat — Conversational assistant ("Zenda AI") that can answer financial questions

## Public surface (HTTP)

### Recommendations

| Method | Path | Auth | Throttle (per minute) | Description |
|--------|------|------|----------------------|-------------|
| GET | `/recommendations` | JWT | (global) | List active recommendations |
| GET | `/recommendations/stats` | JWT | (global) | Total / accepted / acceptance-rate |
| POST | `/recommendations/:id/feedback` | JWT | (global) | Submit accepted=true/false |

### AI chat

| Method | Path | Auth | Throttle (per minute) | Description |
|--------|------|------|----------------------|-------------|
| GET | `/ai/chat/active` | JWT | (global) | Get the active conversation + its message history |
| POST | `/ai/chat` | JWT | **10** | Send a message; append to the active conversation; return assistant reply |
| POST | `/ai/chat/close` | JWT | 10 | Close the active conversation; messages are retained |

For full request/response shapes see Swagger at `/api/docs` (tags: `Recommendations`, `AI Chat`).

## Domain

### Entities

- `RecommendationEntity` — carries lifecycle timestamps (`viewedAt`, `dismissedAt`, `expiresAt`), inlined feedback (`feedbackAccepted`, `feedbackAt`), and AI traceability (`modelVersion`, `source`, `inputContextJson`) for the >=80% accuracy KPI.
- `ConversationEntity` + `MessageEntity` — chat state. **Currently live in this module — B7 will move them to a new `conversations/` module.**

### Enums

- `RecommendationType` — `SAVINGS` / `BUDGET` / `GOAL`.
- `AiConversationStatus` — `ACTIVE` / `CLOSED`. Enforced as one ACTIVE per user at the service layer.
- `AiMessageRole` — `USER` / `ASSISTANT`.

### Ports (abstract repositories)

- `IRecommendationRepository` — listActive, findById, submitFeedback, getStats.
- `IConversationRepository` / `IMessageRepository` — chat persistence.

## Use cases (`application/use-cases/`)

| Use case | Purpose | Audit event (B27) |
|----------|---------|-------------------|
| `GetRecommendationsUseCase` | Returns active recs; calls `AiProvider` (or `LocalRulesProvider` fallback) when no fresh recs and the user has ≥1 month of history | — |
| `SubmitFeedbackUseCase` | Records accepted=true/false; updates acceptance-rate metric | — |
| `GetActiveConversationUseCase` | Returns the ACTIVE conversation + messages; creates a new one if none | — |
| `SendChatMessageUseCase` | Appends user message + calls AI provider + persists assistant reply | — |
| `CloseActiveConversationUseCase` | Sets `status=CLOSED` + `endedAt=now`; messages retained for context | — |

## Persistence (`infrastructure/persistence/`)

- `PrismaRecommendationRepository` — soft-delete filter on category joins.
- `PrismaConversationRepository` / `PrismaMessageRepository` — eager-loads messages ordered by `createdAt` ASC.

## Cross-context dependencies

- `AiProvider` (from `infra/ai/`) — `AzureFoundryProvider` with 15s timeout + `statisticalPrediction()` fallback (see `azure-foundry.provider.ts:81,127-151`).
- `ITransactionRepository` (from `transactions/`) — to gather the user's spending snapshot as input to the prompt.
- `IBudgetRepository` (from `budgets/`) — same.

## Cross-cutting behavior

- **Soft delete:** `Recommendation` is soft-deletable; `AiConversation`/`AiMessage` are not (we want the full history retained).
- **Idempotency-Key:** not used. Recommendations are read-mostly; chat messages are intentionally not idempotent (the same prompt should be able to produce a different completion on retry).
- **Rate limiting:** AI chat at **10/min** — Azure calls are expensive and slow.
- **AI traceability:** every persisted recommendation captures `modelVersion`, `source` (`azure-foundry` / `local-rules`), and the `inputContextJson` so the >=80% accuracy KPI can be computed retroactively. ⚠️ The current `RecommendationResponseDto` drops these fields — see ARCH-09 / B12.

## Open items

- **B7** (⚪ pending) — extract `AiConversation` + `AiMessage` into a new `conversations/` bounded context. They currently live in this module for historical reasons; logically they are their own context.
- **B12** (⚪ pending) — expose the 8 missing fields on `RecommendationResponseDto` (`isActive`, `viewedAt`, `dismissedAt`, `expiresAt`, `feedbackAt`, `modelVersion`, `source`, `inputContextJson`) so the frontend can render lifecycle + AI traceability. See ARCH-09.
- **B19** (⚪ pending) — currently imports `TransactionsModule` and `BudgetsModule` directly; should be facaded.
