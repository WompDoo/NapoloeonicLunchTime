import { BLUCHER, DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import {
  createV0State,
  move,
  P1,
  P2,
  P3,
  P4,
  reinforcement,
} from '@lunch-campaign/content/testing';
import type {
  MatchState,
  PlayerId,
  PlayerOrders,
} from '@lunch-campaign/engine';
import { resolveTurn, toZoneId } from '@lunch-campaign/engine';
import { filterForPlayer } from '../lib/filter-for-player';
import type { PlayerView } from '../lib/player-view';
import type { MatchDay } from './spied-week';

/** Never shown to any player: knowing it would let players predict the event and honour draws. */
export const SECRET_SEED = 'canary-seed-never-shown';

/**
 * The viewer, P1, has only ever had line infantry and stays out of every battle. Anything else in P1's view,
 * whether cavalry, skirmishers, artillery or another player's supply, is a leak.
 */
export const CANARY_START: MatchState = {
  ...createV0State({
    players: [
      { supply: 6 },
      { supply: 7_654_321, commanderId: BLUCHER },
      { supply: 8_765_432 },
      { supply: 9_876_543 },
    ],
    zones: {
      A1: { owner: P1, units: { line: 3 } },
      A4: { owner: P2, units: { cavalry: 4, artillery: 2 } },
      B3: { owner: P2, units: { skirmishers: 3, cavalry: 2, artillery: 1 } },
      C4: { owner: P2, units: { cavalry: 2, artillery: 1 } },
      C3: { owner: P3, units: { line: 2, skirmishers: 2 } },
      D1: { owner: P3, units: { artillery: 2 } },
      D4: { owner: P4, units: { cavalry: 3, skirmishers: 1 } },
    },
  }),
  matchSeed: SECRET_SEED,
};

export const CANARY_ORDERS: readonly PlayerOrders[] = [
  {
    playerId: P1,
    orders: [
      move('A1', 'A2', { line: 1 }),
      { kind: 'recruit', unitType: 'line', count: 1 },
    ],
  },
  {
    playerId: P2,
    orders: [
      move('B3', 'C3', { skirmishers: 3, cavalry: 2 }),
      {
        kind: 'support',
        fromZoneId: toZoneId('B3'),
        targetZoneId: toZoneId('C3'),
        count: 1,
      },
      { kind: 'useAbility', target: reinforcement('C4', 'C3', { cavalry: 1 }) },
      { kind: 'recruit', unitType: 'cavalry', count: 2 },
      move('D1', 'D2', { artillery: 1 }),
    ],
  },
  { playerId: P4, orders: [move('D4', 'D3', { cavalry: 2 })] },
];

/** The day after the canary night. */
export function playCanaryNight(): MatchDay {
  const night = resolveTurn(CANARY_START, CANARY_ORDERS, DEFAULT_MATCH_CONFIG);
  return {
    state: night.state,
    logs: { replayLog: night.replayLog, spyLog: [] },
  };
}

/** One player's view of the day after the canary night. */
export function canaryNightView(viewerId: PlayerId): PlayerView {
  const day = playCanaryNight();
  return filterForPlayer(day.state, day.logs, viewerId, DEFAULT_MATCH_CONFIG);
}
