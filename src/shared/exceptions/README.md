# `shared/exceptions/`

Cross-cutting exception handling.

## `global-exception.filter.ts`

`@Catch()` filter registered as `APP_FILTER` in `app.module.ts`. Normalizes every thrown exception into the canonical error body documented as `ApiErrorResponseDto` in `shared/swagger/`.

### Mapping (introduced in B22 / closes ARCH-21)

| Source | HTTP status | Message |
|--------|-------------|---------|
| `HttpException` (NestJS) | status from `.getStatus()` | passes through |
| `Prisma.PrismaClientKnownRequestError` — `P2002` | 409 Conflict | `Duplicate <field list>: a record with the same value already exists` |
| `Prisma.PrismaClientKnownRequestError` — `P2003` | 400 BadRequest | `Invalid reference: a related resource does not exist` |
| `Prisma.PrismaClientKnownRequestError` — `P2025` | 404 NotFound | `Resource not found` |
| `Prisma.PrismaClientKnownRequestError` — any other code | 500 | `Database error (<code>)` |
| `Prisma.PrismaClientValidationError` | 400 BadRequest | `Invalid query parameters` |
| Anything else | 500 | `Internal server error` (no internal details leaked) |

500-level errors are logged with stack via the local `Logger`. Lower statuses do not log (use cases that throw `HttpException` already know what happened).

### Coexistence with per-use-case catches

Some use cases catch P2002 manually and re-throw with a domain-specific message (e.g. `CreateBudgetUseCase` re-throws `BadRequestException('A budget for this category and period already exists')`). That path keeps working — the manual `HttpException` is passed through by the filter unchanged. Use the manual catch when the user-facing message benefits from domain context; let the filter handle generic cases.

### Not yet mapped

- `PrismaClientInitializationError`
- `PrismaClientRustPanicError`
- `PrismaClientUnknownRequestError`

These currently fall through to the generic 500. Tracked as a follow-up in `docs/audit-issues.md`.
