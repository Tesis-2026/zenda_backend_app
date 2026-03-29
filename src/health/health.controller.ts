import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health.response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
