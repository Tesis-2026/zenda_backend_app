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
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/zenda_test';
process.env.JWT_SECRET = 'test-jwt-secret-not-used-in-contract-tests';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
for (const key of [
  'AZURE_AI_PROJECT_ENDPOINT',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_KEY',
  'FCM_PROJECT_ID',
  'FCM_CLIENT_EMAIL',
  'FCM_PRIVATE_KEY',
  'RESEARCH_DASHBOARD_TOKEN',
])
  process.env[key] = '';
