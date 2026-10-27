import type { INestApplication, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { ApiOptions } from './api.module';
import { ApiModule } from './api.module';

export interface ApiStartOptions extends ApiOptions {
  /** The web client's origin, allowed by CORS; null when nothing cross-origin calls the API. */
  readonly webOrigin: string | null;
  /** Which Nest log levels to print; empty for silence. */
  readonly logLevels: readonly LogLevel[];
}

/** Builds the API, ready to listen. Tests build it with a fake clock and an in-memory database. */
export async function createApi(
  options: ApiStartOptions,
): Promise<INestApplication> {
  const app = await NestFactory.create(ApiModule.register(options), {
    logger: [...options.logLevels],
  });
  allowWebOrigin(app, options.webOrigin);
  return app;
}

function allowWebOrigin(app: INestApplication, webOrigin: string | null): void {
  if (webOrigin !== null) {
    app.enableCors({ origin: webOrigin });
  }
}
