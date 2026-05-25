# `shared/guards/`

> Note: the project's auth guard lives at [`src/modules/auth/infrastructure/jwt-auth.guard.ts`](../../modules/auth/infrastructure/jwt-auth.guard.ts), not here. This folder is reserved for cross-cutting guards that may be added later (e.g. role-based access, feature flags).

## The auth guard

`JwtAuthGuard` extends `AuthGuard('jwt')` from `@nestjs/passport`. The interesting logic lives in the Passport strategy at [`src/modules/auth/infrastructure/jwt.strategy.ts`](../../modules/auth/infrastructure/jwt.strategy.ts):

- Verifies the JWT signature + expiry.
- **B21/B25:** re-loads the user on every request, rejects when:
  - `user` is null → `Account is no longer active` (covers hard delete).
  - `user.isDeleted` → same message (covers soft delete; closes ARCH-20).
  - `user.tokenVersion !== payload.tokenVersion` → `Session has been revoked, please sign in again` (closes ARCH-24; bumped on password reset).
- **B21/B19:** returns `{ sub, email, tokenVersion, consentGiven }` as `req.user` — `consentGiven` is the **live** value from the DB so consent updates take effect on the next request without forcing the client to re-login.

The trade-off accepted: one extra `User.findUnique` per authenticated request. Acceptable now; should consider Redis-backed user caching if request volume grows.

## Adding new guards here

If you add a `RolesGuard`, `FeatureFlagGuard`, etc., create the file in this folder and document it here. Keep the auth guard in its own module — it depends on `IUserRepository` which is an auth-bounded-context port.
