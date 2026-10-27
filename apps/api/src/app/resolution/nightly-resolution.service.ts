import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { requirePresent } from '@lunch-campaign/engine';
import { nextResolutionAt, resolveDueNights } from '../matches/match-play';
import type { MatchSettings } from '../matches/match-settings';
import { MATCH_SETTINGS } from '../matches/match-settings';
import type { MatchStore } from '../persistence/match-store';
import { MATCH_STORE } from '../persistence/match-store';
import type { Clock } from '../platform/clock';
import { CLOCK } from '../platform/clock';
import type { Ticker } from '../platform/ticker';
import { TICKER } from '../platform/ticker';

export const RESOLUTION_CHECK_INTERVAL_MS = 60_000;

/**
 * Resolves every night that is due, once a minute and once at start-up, so a night missed while the server
 * was down resolves as soon as it is back. One failing match is logged and retried next minute without
 * holding up the others.
 */
@Injectable()
export class NightlyResolutionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NightlyResolutionService.name);
  private stopTicking: () => void = (): void => undefined;

  public constructor(
    @Inject(MATCH_STORE) private readonly store: MatchStore,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(TICKER) private readonly ticker: Ticker,
    @Inject(MATCH_SETTINGS) private readonly settings: MatchSettings,
  ) {}

  public onApplicationBootstrap(): void {
    this.resolveDueMatches();
    this.stopTicking = this.ticker.every(
      RESOLUTION_CHECK_INTERVAL_MS,
      (): void => {
        this.resolveDueMatches();
      },
    );
  }

  public onApplicationShutdown(): void {
    this.stopTicking();
  }

  public resolveDueMatches(): void {
    const now = this.clock.now();
    this.store.dueForResolution(now).forEach((matchId): void => {
      this.resolveMatch(matchId, now);
    });
  }

  private resolveMatch(matchId: string, now: Date): void {
    try {
      this.store.inTransaction((): void => {
        const saved = requirePresent(this.store.find(matchId), `match ${matchId}`);
        const resolved = resolveDueNights(saved.match, now, this.settings.config);
        this.store.update(
          saved,
          resolved,
          nextResolutionAt(resolved, this.settings.config),
        );
      });
    } catch (error) {
      this.logger.error(`Resolving match ${matchId} failed`, error);
    }
  }
}
