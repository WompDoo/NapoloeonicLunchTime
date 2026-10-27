import type {
  MatchConfig,
  Order,
  OrderRejection,
  PlayerId,
  ZoneId,
} from '@lunch-campaign/engine';
import {
  isMatchFinished,
  requirePresent,
  resolveTurn,
  validateTurnOrders,
} from '@lunch-campaign/engine';
import type { OrderProblem } from '@lunch-campaign/contracts';
import type { SpyReport } from '@lunch-campaign/player-view';
import { spyOnZone } from '@lunch-campaign/player-view';
import type { TurnWindow } from '../calendar/match-calendar';
import { DomainError, domainError } from '../errors/domain-error';
import type { MatchSettings } from './match-settings';
import type { MatchPlay, StoredMatch } from './stored-match';

export interface SpyOutcome {
  readonly match: StoredMatch;
  readonly report: SpyReport;
}

/** The day taking orders and spies: from the previous night's resolution until this day's deadline. */
export function openDayOf(
  play: MatchPlay,
  now: Date,
  config: MatchConfig,
): TurnWindow | null {
  const window = currentWindow(play, config);
  return window === null ? null : openBeforeDeadline(window, now);
}

/**
 * Replaces the player's submission for the open day: the last one counts. Orders are checked against the
 * current state now and again at resolution, as the spec says; any refused order refuses the submission,
 * so the player can fix it while there is still time.
 */
export function submitOrders(
  match: StoredMatch,
  playerId: PlayerId,
  orders: readonly Order[],
  now: Date,
  settings: MatchSettings,
): StoredMatch {
  const play = requireOpenDay(match, now, settings.config);
  requireValidOrders(
    validateTurnOrders(play.state, [{ playerId, orders }], settings.config)
      .rejections,
  );
  return {
    ...match,
    play: {
      ...play,
      orders: [
        ...play.orders.filter(
          (submission): boolean => submission.playerId !== playerId,
        ),
        { playerId, orders },
      ],
    },
  };
}

/** Spies close with orders at the deadline. A refused spy costs nothing. */
export function sendSpy(
  match: StoredMatch,
  playerId: PlayerId,
  zoneId: ZoneId,
  now: Date,
  settings: MatchSettings,
): SpyOutcome {
  const play = requireOpenDay(match, now, settings.config);
  const outcome = spyOnZone(play.state, settings.config, playerId, zoneId);
  if (outcome.kind === 'rejected') {
    throw domainError(
      `spy.${outcome.reason}`,
      `No spy sent: ${outcome.reason}`,
    );
  }
  return {
    match: {
      ...match,
      play: {
        ...play,
        state: outcome.state,
        spyLog: [...play.spyLog, outcome.report],
      },
    },
    report: outcome.report,
  };
}

/** Resolves every night whose resolution time has passed, oldest first, so a missed night is caught up. */
export function resolveDueNights(
  match: StoredMatch,
  now: Date,
  config: MatchConfig,
): StoredMatch {
  return match.play === null
    ? match
    : resolveDuePlay(match, match.play, now, config);
}

/** When the store should next look at this match: the open day's resolution, or never. */
export function nextResolutionAt(
  match: StoredMatch,
  config: MatchConfig,
): string | null {
  const window = dueWindow(match, config);
  return window === null ? null : window.resolvesAt;
}

export function ordersOf(
  play: MatchPlay,
  playerId: PlayerId,
): readonly Order[] {
  return play.orders
    .filter((submission): boolean => submission.playerId === playerId)
    .flatMap((submission): readonly Order[] => submission.orders);
}

function resolveDuePlay(
  match: StoredMatch,
  play: MatchPlay,
  now: Date,
  config: MatchConfig,
): StoredMatch {
  return isDue(currentWindow(play, config), now)
    ? resolveDueNights(resolveNight(match, play, config), now, config)
    : match;
}

function resolveNight(
  match: StoredMatch,
  play: MatchPlay,
  config: MatchConfig,
): StoredMatch {
  const night = resolveTurn(play.state, play.orders, config);
  return {
    ...match,
    play: {
      ...play,
      state: night.state,
      replayLog: [...play.replayLog, ...night.replayLog],
      orders: [],
    },
  };
}

function dueWindow(match: StoredMatch, config: MatchConfig): TurnWindow | null {
  return match.play === null ? null : currentWindow(match.play, config);
}

function isDue(window: TurnWindow | null, now: Date): boolean {
  return window !== null && now >= new Date(window.resolvesAt);
}

function currentWindow(
  play: MatchPlay,
  config: MatchConfig,
): TurnWindow | null {
  return isMatchFinished(play.state, config)
    ? null
    : requirePresent(
        play.calendar[play.state.turnNumber - 1],
        `calendar day ${play.state.turnNumber}`,
      );
}

function openBeforeDeadline(window: TurnWindow, now: Date): TurnWindow | null {
  return now < new Date(window.deadlineAt) ? window : null;
}

function requireOpenDay(
  match: StoredMatch,
  now: Date,
  config: MatchConfig,
): MatchPlay {
  const play = requireStarted(match);
  requireRunning(play, config);
  if (openDayOf(play, now, config) === null) {
    throw domainError(
      'day.closed',
      "Today's deadline has passed; the next day opens after tonight's resolution",
    );
  }
  return play;
}

function requireStarted(match: StoredMatch): MatchPlay {
  if (match.play === null) {
    throw domainError('match.notStarted', 'The match has not started yet');
  }
  return match.play;
}

function requireRunning(play: MatchPlay, config: MatchConfig): void {
  if (isMatchFinished(play.state, config)) {
    throw domainError('match.finished', 'The match is over');
  }
}

function requireValidOrders(rejections: readonly OrderRejection[]): void {
  if (rejections.length > 0) {
    throw new DomainError(
      'orders.invalid',
      `${rejections.length} orders were refused`,
      rejections.map(
        (rejection): OrderProblem => ({
          orderIndex: rejection.orderIndex,
          reason: rejection.reason,
        }),
      ),
    );
  }
}
