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

    if (record.statusCode === 0) {
      throw new ConflictException(
        'Request is pending confirmation; do not submit it with a new key',
      );
    }

    return {
      statusCode: record.statusCode,
      body: record.responseBody as unknown,
    };
  }

  async claim(params: {
    key: string;
    userId: string;
    requestHash: string;
  }): Promise<CachedResponse | null> {
    try {
      await this.prisma.idempotencyKey.create({
        data: { ...params, statusCode: 0, responseBody: {} },
      });
      return null;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      return this.lookup(params);
    }
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
    await this.prisma.idempotencyKey.update({
      where: { key_userId: { key: params.key, userId: params.userId } },
      data: {
        statusCode: params.statusCode,
        responseBody: (params.body ?? null) as object,
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
