import { Controller, Get, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../infra/prisma/prisma.service';
import { HealthCheckItemDto, HealthResponseDto } from './dto/health.response.dto';

const VERSION = '1.0.0';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness — true unless the Node process is unable to respond.
   * Does NOT check any dependency. Use for k8s livenessProbe.
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — process responsiveness only' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  live(): HealthResponseDto {
    return {
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness — true only when every required dependency is reachable.
   * Returns 503 with a body listing the failed check when not ready.
   * Use for k8s readinessProbe and traffic-gating load balancers.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — verifies all required dependencies' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'A dependency is unreachable' })
  async ready(): Promise<HealthResponseDto> {
    return this.runChecks();
  }

  /**
   * Health — kept as the original general-purpose endpoint and as the
   * target of the Dockerfile HEALTHCHECK. Now identical to /ready
   * (includes DB ping). The Docker HEALTHCHECK will start failing if
   * the DB drops, which is the desired behavior.
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check — includes dependency checks' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'A dependency is unreachable' })
  async health(): Promise<HealthResponseDto> {
    return this.runChecks();
  }

  private async runChecks(): Promise<HealthResponseDto> {
    const checks: Record<string, HealthCheckItemDto> = {
      database: await this.pingDatabase(),
    };

    const isDegraded = Object.values(checks).some((c) => c.status === 'down');
    const body: HealthResponseDto = {
      status: isDegraded ? 'degraded' : 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
      checks,
    };

    if (isDegraded) {
      // Force 503 (with the body included) — clients and probes use the
      // status code; the body explains which check failed.
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }

  private async pingDatabase(): Promise<HealthCheckItemDto> {
    const startedAt = Date.now();
    try {
      // Lightweight: forces a round-trip to PostgreSQL without touching
      // any application table.
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - startedAt };
    } catch (err) {
      return {
        status: 'down',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startedAt,
      };
    }
  }
}
