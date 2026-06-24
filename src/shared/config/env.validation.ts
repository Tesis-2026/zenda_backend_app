import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

/**
 * Strongly-typed view of the env required by the app. Validated at boot
 * via ConfigModule.forRoot({ validate }) — see app.module.ts.
 *
 * Rule of thumb:
 *  - REQUIRED in every environment   → no @IsOptional
 *  - Optional with a meaningful default in configuration.ts → @IsOptional
 *  - Optional but with shape constraints when present       → @IsOptional + type check
 *
 * Production-only checks (e.g. SMTP must be real) are enforced in
 * postValidate() so dev/test can still boot with stubs.
 */
export class EnvSchema {
  // ── App ──────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV?: NodeEnv;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  // ── Database ─────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // ── Auth ─────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  REFRESH_TOKEN_EXPIRES_DAYS?: number;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS?: number;

  // ── Azure OpenAI (optional; LocalRulesProvider is the fallback) ──
  @IsOptional()
  @IsString()
  AZURE_OPENAI_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  AZURE_OPENAI_KEY?: string;

  @IsOptional()
  @IsString()
  AZURE_OPENAI_DEPLOYMENT?: string;

  // ── Azure AI Foundry Agent RAG (optional until chat endpoint is used) ──
  @IsOptional()
  @IsString()
  AZURE_AI_PROJECT_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  AZURE_AI_AGENT_ID?: string;

  @IsOptional()
  @IsString()
  AZURE_AI_AGENT_NAME?: string;

  @IsOptional()
  @IsString()
  AZURE_AI_AUTH_MODE?: string;

  @IsOptional()
  @IsBooleanString()
  AZURE_AI_USE_MANAGED_IDENTITY?: string;

  @IsOptional()
  @IsString()
  AZURE_TENANT_ID?: string;

  @IsOptional()
  @IsString()
  AZURE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  AZURE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  AZURE_AI_AGENT_TIMEOUT_MS?: number;

  @IsOptional()
  @IsString()
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  AZURE_DOCUMENT_INTELLIGENCE_KEY?: string;

  @IsOptional()
  @IsString()
  AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS?: number;

  // ── SMTP (optional in dev/test; required-shape only when set) ────
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT?: number;

  @IsOptional()
  @IsBooleanString()
  SMTP_SECURE?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM?: string;
}

/**
 * Called by `ConfigModule.forRoot({ validate })` once per app start.
 * Throws on any invalid/missing required var so the app crashes at boot
 * instead of failing silently at the first DB/JWT/AI call.
 */
export function validateEnv(rawConfig: Record<string, unknown>): EnvSchema {
  const validated = plainToInstance(EnvSchema, rawConfig, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const summary = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration. The following variables failed validation:\n${summary}\n\nCheck .env.example for the full list and required keys.`,
    );
  }

  postValidate(validated);
  return validated;
}

/**
 * Cross-field checks not expressible as decorators (e.g. "if NODE_ENV is
 * production then SMTP_HOST must not be the dev placeholder").
 */
function postValidate(env: EnvSchema): void {
  if (env.NODE_ENV === NodeEnv.Production) {
    if (!env.SMTP_HOST || env.SMTP_HOST.includes('example.com')) {
      throw new Error(
        'SMTP_HOST must be configured (not the dev placeholder) when NODE_ENV=production.',
      );
    }
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      throw new Error('SMTP_USER and SMTP_PASS are required when NODE_ENV=production.');
    }
  }
}
