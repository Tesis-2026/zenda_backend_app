/**
 * Runs before any module is imported (jest `setupFiles`). The contract suites
 * boot the real `AppModule`, whose `ConfigModule.forRoot({ validate })` rejects
 * a missing `DATABASE_URL` / `JWT_SECRET` at boot. CI has no `.env`, so without
 * these the whole suite fails in `validateEnv` before a single request runs.
 *
 * Prisma is mocked in `createTestApp`, so these values are never used to open a
 * real connection — they only need to be present and non-empty to pass schema
 * validation. We use `??=` so a real local `.env`/CI secret still wins.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/zenda_test';
process.env.JWT_SECRET ??= 'test-jwt-secret-not-used-in-contract-tests';
