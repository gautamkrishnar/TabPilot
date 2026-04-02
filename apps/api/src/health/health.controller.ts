import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns 200 when the API is ready.' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy.',
    schema: { example: { status: 'ok', timestamp: '2026-04-01T00:00:00.000Z' } },
  })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
