import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health.response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiOkResponse({ type: HealthResponseDto })
  check() {
    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
