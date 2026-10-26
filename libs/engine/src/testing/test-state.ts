import type { PlayerId, ZoneId } from '../lib/core/ids';
import { toPlayerId, toZoneId } from '../lib/core/ids';
import { createUnitCounts } from '../lib/core/unit-counts';
import type { UnitCounts } from '../lib/core/unit-types';
import type { MoveOrder, RecruitOrder } from '../lib/orders/orders';
import type { UnitType } from '../lib/core/unit-types';
import type {
  Army,
  MatchState,
  PlayerState,
  ZoneState,
} from '../lib/state/match-state';
import { TEST_CONFIG } from './test-config';

export const P1 = toPlayerId('p1');
export const P2 = toPlayerId('p2');
export const P3 = toPlayerId('p3');
export const P4 = toPlayerId('p4');

export function zoneId(id: string): ZoneId {
  return toZoneId(id);
}

export function units(counts: Partial<UnitCounts>): UnitCounts {
  return createUnitCounts(counts);
}

export interface TestArmy {
  readonly playerId: PlayerId;
  readonly units: Partial<UnitCounts>;
}

/** `units` is shorthand for a single army belonging to `owner`; `armies` sets armies explicitly. */
export interface TestZone {
  readonly owner?: PlayerId;
  readonly units?: Partial<UnitCounts>;
  readonly armies?: readonly TestArmy[];
}

export interface TestStateOptions {
  readonly turnNumber?: number;
  readonly players?: readonly Partial<PlayerState>[];
  readonly zones?: Readonly<Record<string, TestZone>>;
}

const DEFAULT_PLAYERS: readonly PlayerState[] = [
  {
    playerId: P1,
    seat: 1,
    startingCapitalZoneId: toZoneId('A1'),
    supply: 6,
    score: 0,
  },
  {
    playerId: P2,
    seat: 2,
    startingCapitalZoneId: toZoneId('A3'),
    supply: 6,
    score: 0,
  },
  {
    playerId: P3,
    seat: 3,
    startingCapitalZoneId: toZoneId('C1'),
    supply: 6,
    score: 0,
  },
  {
    playerId: P4,
    seat: 4,
    startingCapitalZoneId: toZoneId('C3'),
    supply: 6,
    score: 0,
  },
];

const DEFAULT_TEST_STATE_OPTIONS: Required<TestStateOptions> = {
  turnNumber: 1,
  players: DEFAULT_PLAYERS,
  zones: {},
};

interface ResolvedTestZone {
  readonly owner: PlayerId | null;
  readonly units: Partial<UnitCounts> | null;
  readonly armies: readonly TestArmy[];
}

const EMPTY_TEST_ZONE: ResolvedTestZone = {
  owner: null,
  units: null,
  armies: [],
};

/**
 * Builds a state on the test map. Unlike `createInitialMatchState`, every zone starts neutral and empty,
 * so each test sets up exactly the position it is about.
 */
export function createTestState(options: TestStateOptions): MatchState {
  const { turnNumber, players, zones } = {
    ...DEFAULT_TEST_STATE_OPTIONS,
    ...options,
  };
  return {
    matchSeed: 'test-seed',
    turnNumber,
    players: players.map(
      (player, index): PlayerState => ({
        ...(DEFAULT_PLAYERS[index] as PlayerState),
        ...player,
      }),
    ),
    zones: TEST_CONFIG.map.zones.map(
      (zone): ZoneState =>
        toZoneState(zone.id, { ...EMPTY_TEST_ZONE, ...zones[zone.id] }),
    ),
  };
}

function toZoneState(id: ZoneId, setup: ResolvedTestZone): ZoneState {
  return {
    zoneId: id,
    ownerId: setup.owner,
    armies: [...shorthandArmies(setup), ...setup.armies.map(toArmy)],
  };
}

function shorthandArmies(setup: ResolvedTestZone): readonly Army[] {
  return setup.owner === null ? [] : armiesFromCounts(setup.owner, setup.units);
}

function armiesFromCounts(
  owner: PlayerId,
  counts: Partial<UnitCounts> | null,
): readonly Army[] {
  return counts === null ? [] : [toArmy({ playerId: owner, units: counts })];
}

function toArmy(army: TestArmy): Army {
  return { playerId: army.playerId, units: createUnitCounts(army.units) };
}

export function moveOrder(
  from: string,
  to: string,
  counts: Partial<UnitCounts>,
): MoveOrder {
  return {
    kind: 'move',
    fromZoneId: toZoneId(from),
    toZoneId: toZoneId(to),
    units: createUnitCounts(counts),
  };
}

export function recruitOrder(unitType: UnitType, count: number): RecruitOrder {
  return { kind: 'recruit', unitType, count };
}

/** Recursively freezes a value so any mutation by the code under test throws. */
export function deepFreeze<T>(value: T): T {
  if (isObject(value)) {
    Object.values(value).forEach((child): unknown => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}
