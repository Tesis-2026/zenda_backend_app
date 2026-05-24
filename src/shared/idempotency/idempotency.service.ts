import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';

export type CachedResponse = {
  statusCode: number;
  body: unknown;
};

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stable hash of the request shape so the same key cannot be reused
   * for a different payload (which would silently return a stale cached
   * response). Includes method + path + JSON-stringified body.
   */
  computeRequestHash(method: string, path: string, body: unknown): string {
    const payload = `${method.toUpperCase()} ${path}\n${stableStringify(body)}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Look up a record. Returns the cached response when the hash matches;
   * throws Conflict when the same (key, user) was used with a different
   * payload; returns null when no record exists.
   */
  async lookup(params: {
    key: string;
    userId: string;
    requestHash: string;
  }): Promise<CachedResponse | null> {
    const record = await this.prisma.idempotencyKey.findUnique({
      where: { key_userId: { key: params.key, userId: params.userId } },
    });

    if (!record) return null;

    if (record.requestHash !== params.requestHash) {
      throw new ConflictException(
        'Idempotency-Key has been used for a different request payload',
      );
    }

    return {
      statusCode: record.statusCode,
      body: record.responseBody as unknown,
    };
  }

  async store(params: {
    key: string;
    userId: string;
    requestHash: string;
    statusCode: number;
    body: unknown;
  }): Promise<void> {
    // Use upsert defensively — a concurrent first request from the same
    // client could race; we still want a single row.
    await this.prisma.idempotencyKey.upsert({
      where: { key_userId: { key: params.key, userId: params.userId } },
      create: {
        key: params.key,
        userId: params.userId,
        requestHash: params.requestHash,
        statusCode: params.statusCode,
        responseBody: (params.body ?? null) as object,
      },
      update: {
        // First writer wins; if a duplicate slipped in, leave it alone.
      },
    });
  }
}

/**
 * Deterministic JSON.stringify — sorts object keys so { a, b } and
 * { b, a } produce the same hash. Arrays keep their order.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}
