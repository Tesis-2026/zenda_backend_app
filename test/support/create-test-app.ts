import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ThrottlerGuard } from '@nestjs/throttler';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { EmailService } from '../../src/infra/email/email.service';
import { FcmService } from '../../src/infra/fcm/fcm.service';
import { JwtAuthGuard } from '../../src/modules/auth/infrastructure/jwt-auth.guard';
import { createPrismaMock, PrismaMock } from './prisma.mock';

export interface TestAppContext {
  app: INestApplication;
  prisma: PrismaMock;
}

export interface CreateTestAppOptions {
  /**
   * When provided, `JwtAuthGuard` is replaced by a stub that lets every request
   * through and injects this object as `req.user` (so `@UserId()` resolves it).
   * Omit to exercise the real guard (e.g. in the auth suite).
   */
  user?: {
    sub: string;
    email?: string;
    tokenVersion?: number;
    consentGiven?: boolean;
  };
  /**
   * Replace domain providers (e.g. repository ports) with fakes so a use case
   * receives controlled domain objects without touching Prisma.
   */
  overrides?: Array<{ provide: unknown; useValue: unknown }>;
}

/**
 * Boots the real Nest app (full HTTP pipeline: validation pipe, DTO mapping,
 * global filter/interceptors, `/api` prefix) with persistence mocked — NO DB.
 * Returns the app plus the `prisma` mock so tests configure return values.
 *
 * Mirrors the global setup from `src/main.ts` so responses match production.
 */
export async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<TestAppContext> {
  const prisma = createPrismaMock();

  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(EmailService)
    .useValue({
      sendPasswordResetEmail: jest.fn(),
      sendOtpEmail: jest.fn(),
      sendAccountVerificationEmail: jest.fn(),
    })
    .overrideProvider(FcmService)
    .useValue({
      sendToUser: jest.fn(),
      sendToToken: jest.fn(),
      send: jest.fn(),
    })
    // Rate limiting is a production concern; disable it in contract tests so the
    // suites can fire requests freely without tripping the global ThrottlerGuard.
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true });

  if (options.user) {
    builder.overrideGuard(JwtAuthGuard).useValue({
      canActivate: (ctx: any) => {
        ctx.switchToHttp().getRequest().user = options.user;
        return true;
      },
    });
  }

  for (const o of options.overrides ?? []) {
    builder.overrideProvider(o.provide as never).useValue(o.useValue);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return { app, prisma };
}
