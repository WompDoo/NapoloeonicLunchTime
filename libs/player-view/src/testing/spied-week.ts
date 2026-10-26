import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type {
  MatchState,
  PlayerId,
  PlayerOrders,
  ZoneId,
} from '@lunch-campaign/engine';
import {
  createInitialMatchState,
  requirePresent,
  resolveTurn,
  toZoneId,
} from '@lunch-campaign/engine';
import {
  KUTUZOV_PLAYER,
  NAPOLEON_PLAYER,
  WEEK_ORDERS,
  WEEK_SEATING,
  WEEK_SEED,
} from '@lunch-campaign/honours/testing';
import { filterForPlayer } from '../lib/filter-for-player';
import type { MatchLogs, PlayerView } from '../lib/player-view';
import { spyOnZone } from '../lib/spy-on-zone';

export {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  WELLINGTON_PLAYER,
  WEEK_SEED,
} from '@lunch-campaign/honours/testing';

export interface SpyAction {
  readonly playerId: PlayerId;
  readonly zoneId: ZoneId;
}

function spy(playerId: PlayerId, zone: string): SpyAction {
  return { playerId, zoneId: toZoneId(zone) };
}

/**
 * Daytime spies on top of the scripted M3 week. Only Kutuzov, who never buys anything, and Napoleon after his
 * Monday recruit spend supply on spies, so every night resolves exactly as in the honours scenario.
 */
export const WEEK_SPIES: readonly (readonly SpyAction[])[] = [
  [spy(KUTUZOV_PLAYER, 'A1')],
  [spy(KUTUZOV_PLAYER, 'D4')],
  [spy(KUTUZOV_PLAYER, 'C3'), spy(NAPOLEON_PLAYER, 'B3')],
  [spy(KUTUZOV_PLAYER, 'B2')],
  [spy(NAPOLEON_PLAYER, 'B3'), spy(KUTUZOV_PLAYER, 'C3')],
];

/** The match as it stands during one day, after that day's spies. */
export interface MatchDay {
  readonly state: MatchState;
  readonly logs: MatchLogs;
}

const NO_LOGS: MatchLogs = { replayLog: [], spyLog: [] };

/** Monday to Friday, each after that day's spies, then the finished match. */
export function playSpiedWeek(): readonly MatchDay[] {
  const monday: MatchDay = {
    state: createInitialMatchState(
      DEFAULT_MATCH_CONFIG,
      WEEK_SEATING,
      WEEK_SEED,
    ),
    logs: NO_LOGS,
  };
  return WEEK_ORDERS.reduce<readonly MatchDay[]>(
    (days, orders, index) => {
      const today = sendSpies(
        requirePresent(days.at(-1), 'the current day'),
        requirePresent(WEEK_SPIES[index], `spies for day ${index}`),
      );
      return [...days.slice(0, -1), today, resolveNight(today, orders)];
    },
    [monday],
  );
}

/** One player's view of one day of the spied week: 0 is Monday, 5 is after Friday night. */
export function spiedWeekView(
  dayIndex: number,
  viewerId: PlayerId,
): PlayerView {
  const day = requirePresent(playSpiedWeek()[dayIndex], `day ${dayIndex}`);
  return filterForPlayer(day.state, day.logs, viewerId, DEFAULT_MATCH_CONFIG);
}

function sendSpies(day: MatchDay, spies: readonly SpyAction[]): MatchDay {
  return spies.reduce(sendSpy, day);
}

function sendSpy(day: MatchDay, action: SpyAction): MatchDay {
  const outcome = spyOnZone(
    day.state,
    DEFAULT_MATCH_CONFIG,
    action.playerId,
    action.zoneId,
  );
  if (outcome.kind === 'rejected') {
    throw new Error(`Scripted spy was rejected: ${outcome.reason}`);
  }
  return {
    state: outcome.state,
    logs: { ...day.logs, spyLog: [...day.logs.spyLog, outcome.report] },
  };
}

function resolveNight(
  day: MatchDay,
  orders: readonly PlayerOrders[],
): MatchDay {
  const night = resolveTurn(day.state, orders, DEFAULT_MATCH_CONFIG);
  return {
    state: night.state,
    logs: {
      ...day.logs,
      replayLog: [...day.logs.replayLog, ...night.replayLog],
    },
  };
}
