/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Flexible in-memory PrismaService mock for contract tests — NO real DB.
 *
 * Every model (`prisma.user`, `prisma.transaction`, ...) is lazily created as
 * an object of `jest.fn()`s with safe defaults (findUnique→null, findMany→[],
 * count→0, etc.). Each test overrides only the calls its flow makes, e.g.:
 *
 *   prisma.user.findUnique.mockResolvedValue(makeUserRow());
 *   prisma.transaction.create.mockResolvedValue(makeTransactionRow());
 *
 * `$queryRaw` resolves so the health probe passes; `$transaction` supports both
 * the array form and the interactive-callback form (passed the same mock).
 */

export type PrismaMock = any;

function makeModelMock() {
  return {
    findUnique: jest.fn().mockResolvedValue(null),
    findUniqueOrThrow: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findFirstOrThrow: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    // Default to a resolved promise so fire-and-forget writers
    // (AnalyticsService.track, AuditLogService.record → `.create(...).catch()`)
    // don't blow up on `undefined.catch`. Tests override return values per flow.
    create: jest.fn().mockResolvedValue({}),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    // Shape matches Prisma's aggregate result so callers can read
    // `r._sum.amount` etc. without crashing on `undefined`.
    aggregate: jest
      .fn()
      .mockResolvedValue({ _sum: {}, _avg: {}, _count: {}, _min: {}, _max: {} }),
    groupBy: jest.fn().mockResolvedValue([]),
  };
}

export function createPrismaMock(): PrismaMock {
  const models = new Map<string, ReturnType<typeof makeModelMock>>();

  const base: Record<string, any> = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    // Health probe: SELECT 1 round-trip.
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $executeRaw: jest.fn().mockResolvedValue(0),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const proxy: PrismaMock = new Proxy(base, {
    get(target, prop: string | symbol) {
      if (typeof prop !== 'string') return (target as any)[prop];
      if (prop === '$transaction') {
        return jest.fn(async (arg: any) =>
          Array.isArray(arg) ? Promise.all(arg) : arg(proxy),
        );
      }
      if (prop in target) return target[prop];
      // Lazily materialize a model mock for any `prisma.<model>` access.
      if (!models.has(prop)) models.set(prop, makeModelMock());
      return models.get(prop);
    },
  });

  return proxy;
}
