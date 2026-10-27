import type { LogLevel } from '@nestjs/common';
import type { ApiStartOptions } from './create-api';

/** Production settings, read from environment variables. */
export interface ApiEnvironment extends ApiStartOptions {
  readonly port: number;
}

interface EnvironmentValues {
  readonly port: string;
  readonly databasePath: string;
  readonly webOrigin: string | null;
}

const DEFAULTS: EnvironmentValues = {
  port: '3000',
  databasePath: 'lunch-campaign.sqlite',
  webOrigin: null,
};

const PRODUCTION_LOG_LEVELS: readonly LogLevel[] = ['log', 'warn', 'error'];

/**
 * PORT, DATABASE_PATH and WEB_ORIGIN, each with a default. A port that is not a whole number fails at
 * start-up instead of listening somewhere unexpected.
 */
export function apiEnvironmentOf(
  variables: Readonly<Record<string, string | undefined>>,
): ApiEnvironment {
  const values: EnvironmentValues = {
    ...DEFAULTS,
    ...definedOnly({
      port: variables['PORT'],
      databasePath: variables['DATABASE_PATH'],
      webOrigin: variables['WEB_ORIGIN'],
    }),
  };
  return {
    port: portOf(values.port),
    databasePath: values.databasePath,
    webOrigin: values.webOrigin,
    logLevels: PRODUCTION_LOG_LEVELS,
  };
}

function definedOnly(
  values: Readonly<Record<keyof EnvironmentValues, string | undefined>>,
): Partial<EnvironmentValues> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): boolean => entry[1] !== undefined,
    ),
  );
}

function portOf(text: string): number {
  const port = Number(text);
  if (!Number.isInteger(port)) {
    throw new Error(`PORT must be a whole number, got "${text}"`);
  }
  return port;
}
