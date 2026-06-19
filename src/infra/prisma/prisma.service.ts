import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      // Don't crash the whole app if the database is unreachable at boot — the
      // HTTP server (and Swagger at /api/docs) still comes up, Prisma reconnects
      // lazily on the first query, and /api/health surfaces the failure.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Prisma failed to connect at startup: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
