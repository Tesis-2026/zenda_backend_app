process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5433/zenda_test?schema=public';
process.env.JWT_SECRET ??= 'test-jwt-secret-48-bytes-minimum-for-contract-tests';
