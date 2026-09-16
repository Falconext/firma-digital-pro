import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint de salud (GET /api/health): Railway lo consulta para saber que
 * la API arrancó bien. No requiere sesión.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { ok: true, uptime: Math.round(process.uptime()) };
  }
}
