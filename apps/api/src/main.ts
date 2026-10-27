import type { INestApplication } from '@nestjs/common';
import type { ApiEnvironment } from './app/api-environment';
import { apiEnvironmentOf } from './app/api-environment';
import { createApi } from './app/create-api';

const environment: ApiEnvironment = apiEnvironmentOf(process.env);

/** The running server, for anything that needs to close it. */
export const runningApi: Promise<INestApplication> = createApi(
  environment,
).then(async (app): Promise<INestApplication> => {
  await app.listen(environment.port);
  return app;
});
