import { Controller, Get } from '@nestjs/common';

export interface Health {
  readonly status: 'ok';
}

@Controller('health')
export class HealthController {
  @Get()
  public health(): Health {
    return { status: 'ok' };
  }
}
