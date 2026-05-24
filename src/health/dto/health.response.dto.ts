import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthCheckItemDto {
  @ApiProperty({ enum: ['ok', 'down'], example: 'ok' })
  status!: 'ok' | 'down';

  @ApiPropertyOptional({ example: 'connection refused', description: 'Set only when status=down' })
  error?: string;

  @ApiPropertyOptional({ example: 12, description: 'Round-trip latency in ms when measured' })
  latencyMs?: number;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiPropertyOptional({
    description: 'Per-dependency check results. Present on /health and /ready; absent on /live.',
  })
  checks?: Record<string, HealthCheckItemDto>;
}
