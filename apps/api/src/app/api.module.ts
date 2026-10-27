import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseSync } from 'node:sqlite';
import { PlayerAuthenticator } from './auth/player-authenticator';
import { ApiExceptionFilter } from './http/api-exception.filter';
import { HealthController } from './http/health.controller';
import { InvitesController } from './http/invites.controller';
import { MatchesController } from './http/matches.controller';
import type { MatchSettings } from './matches/match-settings';
import { DEFAULT_MATCH_SETTINGS, MATCH_SETTINGS } from './matches/match-settings';
import { MatchesService } from './matches/matches.service';
import { MATCH_STORE } from './persistence/match-store';
import { SqliteMatchStore } from './persistence/sqlite-match-store';
import type { Clock } from './platform/clock';
import { CLOCK, systemClock } from './platform/clock';
import type { RandomSource } from './platform/random-source';
import { cryptoRandomSource, RANDOM_SOURCE } from './platform/random-source';
import type { Ticker } from './platform/ticker';
import { intervalTicker, TICKER } from './platform/ticker';
import { NightlyResolutionService } from './resolution/nightly-resolution.service';

/** What the API is wired to. Everything but the database path has a production default. */
export interface ApiDependencies {
  /** A file path, or ":memory:" for a database that lives as long as the process. */
  readonly databasePath: string;
  readonly clock: Clock;
  readonly ticker: Ticker;
  readonly random: RandomSource;
  readonly settings: MatchSettings;
}

export type ApiOptions = Pick<ApiDependencies, 'databasePath'> &
  Partial<Omit<ApiDependencies, 'databasePath'>>;

const PRODUCTION_DEPENDENCIES: Omit<ApiDependencies, 'databasePath'> = {
  clock: systemClock,
  ticker: intervalTicker,
  random: cryptoRandomSource,
  settings: DEFAULT_MATCH_SETTINGS,
};

@Module({})
export class ApiModule {
  public static register(options: ApiOptions): DynamicModule {
    const dependencies: ApiDependencies = {
      ...PRODUCTION_DEPENDENCIES,
      ...options,
    };
    return {
      module: ApiModule,
      controllers: [HealthController, InvitesController, MatchesController],
      providers: [
        { provide: CLOCK, useValue: dependencies.clock },
        { provide: TICKER, useValue: dependencies.ticker },
        { provide: RANDOM_SOURCE, useValue: dependencies.random },
        { provide: MATCH_SETTINGS, useValue: dependencies.settings },
        {
          provide: MATCH_STORE,
          useFactory: (): SqliteMatchStore =>
            new SqliteMatchStore(new DatabaseSync(dependencies.databasePath)),
        },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
        PlayerAuthenticator,
        MatchesService,
        NightlyResolutionService,
      ],
    };
  }
}
