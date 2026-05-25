# auth

Identity bounded context: registration, login (with lockout), password reset (token + OTP), JWT issuance/refresh/revocation.

## User stories

- US-0101 — Register with email + password
- US-0102 — Login with lockout after 3 failed attempts
- US-VERIF-01 — 6-digit OTP for password reset
- US-S-07 — Reset password revokes existing sessions
- US-1306 — Account deletion (handled in `users/` controller; auth participates via cascade)

## Public surface (HTTP)

| Method | Path | Auth | Throttle (per minute) | Description |
|--------|------|------|----------------------|-------------|
| POST | `/auth/register` | — | 10 | Create user, return access + refresh tokens |
| POST | `/auth/login` | — | 20 | Authenticate, lockout after 3 failures |
| POST | `/auth/refresh` | — | 30 | Rotate refresh token + new access token |
| POST | `/auth/logout` | JWT | (global 120) | Revoke all refresh tokens for the user |
| POST | `/auth/forgot-password` | — | 5 | Send password-reset email (legacy link flow) |
| POST | `/auth/send-otp` | — | 5 | Send 6-digit OTP for reset |
| POST | `/auth/verify-otp` | — | 3 | Exchange OTP for a reset token |
| POST | `/auth/reset-password` | — | 5 | Apply new password; bumps `tokenVersion` |

For full request/response shapes see Swagger at `/api/docs` (tag: `Auth`).

## Domain

### Entities

- `UserEntity` — carries `tokenVersion` (B25), `consentGiven` (US-1303 / B19), `failedLoginAttempts`, `lockedUntil`, `deletedAt`. Exposes `isLocked` and `isDeleted` getters used by the JWT strategy.

### Ports (abstract repositories)

- `IUserRepository` — `findByEmail` (filters `deletedAt: null` per S-02), `findById` (does **not** filter soft-deleted — the JWT strategy needs to see them to reject explicitly), `create`, `updatePasswordHash`, `incrementFailedLogin` (atomic), `clearFailedLogin`, `lockAccount`, `bumpTokenVersion` (atomic; introduced in B25).
- `IRefreshTokenRepository` — create / findByToken / deleteByToken / deleteByUserId.
- `IPasswordResetTokenRepository` — hashed token storage (S-06).
- `IAuthChallengeRepository` — unified OTP + reset-token storage (ERD `auth_challenges`).

## Use cases (`application/use-cases/`)

| Use case | Purpose | Audit event (B27) |
|----------|---------|-------------------|
| `RegisterUseCase` | Hash password + create user + sign tokens with `tokenVersion`/`consentGiven` | — (analytics only) |
| `LoginUseCase` | Verify password, manage lockout, sign tokens | `LOGIN_FAILED` / `LOGIN_LOCKED` on bad creds |
| `RefreshAccessTokenUseCase` | Rotate refresh token + issue new access token | — |
| `LogoutUseCase` | Delete refresh tokens for the user | — |
| `ForgotPasswordUseCase` | Issue + email a reset token | — |
| `SendOtpUseCase` | Issue + email a 6-digit OTP | — |
| `VerifyOtpUseCase` | Validate OTP + return a reset token | — |
| `ResetPasswordUseCase` | Update password, `bumpTokenVersion()` (B25), revoke refresh tokens | `RESET_PASSWORD` with `metadata.allSessionsRevoked=true` |

## Persistence (`infrastructure/persistence/`)

- `PrismaUserRepository` — owns the Decimal boundary for `averageMonthlyIncome`. `findById` deliberately does **not** filter soft-deleted users so the JWT strategy can return a specific 401 reason.
- `PrismaRefreshTokenRepository` — token stored raw (not hashed) since it's a single-use rotation credential and the column has a unique index.
- `PrismaPasswordResetRepository` / `PrismaPasswordResetOtpRepository` — secrets are SHA-256 hashed before persistence (S-01 / S-06).

## JWT strategy (`infrastructure/jwt.strategy.ts`)

- Validates signature + expiry via `passport-jwt`.
- Re-loads the user on every authenticated request (B21/B25 / ARCH-20).
- Rejects with `Account is no longer active` if `user.deletedAt != null`.
- Rejects with `Session has been revoked` if `user.tokenVersion !== payload.tokenVersion`.
- Returns `{ sub, email, tokenVersion, consentGiven }` as `req.user` — `consentGiven` is the live value from the DB so consent updates take effect on next request without re-login.

## Cross-context dependencies

- `EmailService` (from `infra/email/`) — sends password-reset and OTP emails.
- No direct cross-context module imports — auth is the root of the dependency graph; other modules import `JwtAuthGuard` and `@UserId()` from `auth/`.

## Audit events (B27)

| Action | Status | Trigger |
|--------|--------|---------|
| `LOGIN_FAILED` | FAILURE | Wrong password, attempts < 3 |
| `LOGIN_LOCKED` | FAILURE | Wrong password, attempts ≥ 3 — account locked for 15 min |
| `RESET_PASSWORD` | SUCCESS | Password updated via reset flow |
| `DELETE_ACCOUNT` | SUCCESS | Written inline in `users/users.controller.ts` (must be transactional with the User row deletion) |

## Cross-cutting behavior

- **Soft delete:** `User` is soft-deleted; auth queries respect `deletedAt: null` per S-02.
- **Idempotency-Key:** not used (auth endpoints intentionally not opt-in — clients should not retry login).
- **Rate limiting:** per-endpoint `@Throttle` decorators (see table above).
- **Special error mapping:** `LoginUseCase` returns `UnauthorizedException` with a remaining-attempts hint after each bad password.

## Open items

- **B14** (⚪ pending) — expose `failedAttempts` / `lockedUntil` in the 401 response body so the frontend can render a real countdown instead of the cosmetic SharedPreferences-backed one. See ARCH-10.
- **B19** (⚪ pending) — `AuthModule` is currently imported directly by `UsersModule`; should be facaded. See ARCH-17.
