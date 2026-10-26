import {
  DEFAULT_MATCH_CONFIG,
  KUTUZOV,
  MURAT,
  NAPOLEON,
  WELLINGTON,
} from '@lunch-campaign/content';
import type {
  MatchState,
  Order,
  PlayerOrders,
  PlayerSeating,
  ReplayEvent,
  TurnResult,
  UnitCounts,
  UnitType,
} from '@lunch-campaign/engine';
import {
  createInitialMatchState,
  createUnitCounts,
  resolveTurn,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/engine';

/** Draws Typhus for Wednesday and the honours Last Stand, Blitz and Iron Discipline. */
export const WEEK_SEED = 'lunch-week-2';
export const NAPOLEON_PLAYER = toPlayerId('napoleon-player');
export const WELLINGTON_PLAYER = toPlayerId('wellington-player');
export const KUTUZOV_PLAYER = toPlayerId('kutuzov-player');
export const MURAT_PLAYER = toPlayerId('murat-player');

export const WEEK_SEATING: readonly PlayerSeating[] = [
  { playerId: NAPOLEON_PLAYER, seat: 1, commanderId: NAPOLEON },
  { playerId: WELLINGTON_PLAYER, seat: 2, commanderId: WELLINGTON },
  { playerId: KUTUZOV_PLAYER, seat: 3, commanderId: KUTUZOV },
  { playerId: MURAT_PLAYER, seat: 4, commanderId: MURAT },
];

function move(
  from: string,
  to: string,
  units: Partial<UnitCounts>,
  via: readonly string[] = [],
): Order {
  return {
    kind: 'move',
    fromZoneId: toZoneId(from),
    viaZoneIds: via.map(toZoneId),
    toZoneId: toZoneId(to),
    units: createUnitCounts(units),
  };
}

function support(from: string, target: string, count: number): Order {
  return {
    kind: 'support',
    fromZoneId: toZoneId(from),
    targetZoneId: toZoneId(target),
    count,
  };
}

function recruit(unitType: UnitType, count: number): Order {
  return { kind: 'recruit', unitType, count };
}

/**
 * A scripted week on the v0 map (see the M3 summary for the hand-checked narrative):
 * Monday and Tuesday expand; Wednesday (Typhus) Napoleon holds B2 with his guns and Kutuzov takes C3 from Murat;
 * Thursday Murat retakes C3; Friday Napoleon's guns end Wellington's attack before combat while Murat takes
 * three zones, Kutuzov retreating each time.
 */
export const WEEK_ORDERS: readonly (readonly PlayerOrders[])[] = [
  [
    {
      playerId: NAPOLEON_PLAYER,
      orders: [
        move('A1', 'A2', { line: 2, cavalry: 2 }),
        move('A1', 'B1', { skirmishers: 1 }),
        recruit('line', 1),
      ],
    },
    {
      playerId: WELLINGTON_PLAYER,
      orders: [
        move('A4', 'A3', { cavalry: 2, skirmishers: 2 }),
        move('A4', 'B4', { line: 1 }),
      ],
    },
    {
      playerId: KUTUZOV_PLAYER,
      orders: [move('D1', 'C1', { line: 3 }), move('D1', 'D2', { cavalry: 1 })],
    },
    {
      playerId: MURAT_PLAYER,
      orders: [
        move('D4', 'C3', { cavalry: 2 }, ['C4']),
        move('D4', 'D3', { skirmishers: 1 }),
      ],
    },
  ],
  [
    {
      playerId: NAPOLEON_PLAYER,
      orders: [
        move('A2', 'B2', { line: 2, cavalry: 2 }),
        move('A1', 'A2', { artillery: 1 }),
      ],
    },
    {
      playerId: WELLINGTON_PLAYER,
      orders: [move('A3', 'B3', { cavalry: 2, skirmishers: 2 })],
    },
    { playerId: KUTUZOV_PLAYER, orders: [move('C1', 'C2', { line: 3 })] },
    { playerId: MURAT_PLAYER, orders: [recruit('skirmishers', 2)] },
  ],
  [
    { playerId: NAPOLEON_PLAYER, orders: [support('A2', 'B2', 1)] },
    {
      playerId: WELLINGTON_PLAYER,
      orders: [move('B3', 'B2', { cavalry: 2, skirmishers: 2 })],
    },
    { playerId: KUTUZOV_PLAYER, orders: [move('C2', 'C3', { line: 3 })] },
  ],
  [
    {
      playerId: WELLINGTON_PLAYER,
      orders: [recruit('line', 3), move('B4', 'B3', { line: 1 })],
    },
    {
      playerId: MURAT_PLAYER,
      orders: [move('D3', 'C3', { skirmishers: 1 }), recruit('cavalry', 2)],
    },
  ],
  [
    { playerId: NAPOLEON_PLAYER, orders: [support('A2', 'B2', 1)] },
    { playerId: WELLINGTON_PLAYER, orders: [move('B3', 'B2', { line: 1 })] },
    {
      playerId: MURAT_PLAYER,
      orders: [
        move('C3', 'C2', { skirmishers: 1 }),
        move('D4', 'D2', { cavalry: 2 }, ['D3']),
        move('D4', 'C4', { line: 1 }),
      ],
    },
  ],
];

export interface PlayedWeek {
  readonly start: MatchState;
  readonly end: MatchState;
  readonly replayLog: readonly ReplayEvent[];
}

interface WeekSoFar {
  readonly state: MatchState;
  readonly replayLog: readonly ReplayEvent[];
}

export function playWeek(): PlayedWeek {
  const start = createInitialMatchState(
    DEFAULT_MATCH_CONFIG,
    WEEK_SEATING,
    WEEK_SEED,
  );
  const end = WEEK_ORDERS.reduce<WeekSoFar>(
    (week, orders) => {
      const night: TurnResult = resolveTurn(
        week.state,
        orders,
        DEFAULT_MATCH_CONFIG,
      );
      return {
        state: night.state,
        replayLog: [...week.replayLog, ...night.replayLog],
      };
    },
    { state: start, replayLog: [] },
  );
  return { start, end: end.state, replayLog: end.replayLog };
}
