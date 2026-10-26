import type { PlayerId, ZoneId } from '../lib/core/ids';
import { toPlayerId, toZoneId } from '../lib/core/ids';
import { createUnitCounts } from '../lib/core/unit-counts';
import type { UnitCounts, UnitType } from '../lib/core/unit-types';
import type { AbilityTarget } from '../lib/modifiers/ability-target';
import type { ActiveModifier } from '../lib/modifiers/active-modifiers';
import type {
  BuyUpgradeOrder,
  MoveOrder,
  RecruitOrder,
  SupportOrder,
  UseAbilityOrder,
} from '../lib/orders/orders';
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
  readonly modifiers?: readonly ActiveModifier[];
}

function defaultPlayer(
  playerId: PlayerId,
  seat: number,
  capital: string,
): PlayerState {
  return {
    playerId,
    seat,
    startingCapitalZoneId: toZoneId(capital),
    supply: 6,
    score: 0,
    commanderId: 'plain',
    upgrades: [],
    abilityUsed: false,
    eliminated: false,
  };
}

const DEFAULT_PLAYERS: readonly PlayerState[] = [
  defaultPlayer(P1, 1, 'A1'),
  defaultPlayer(P2, 2, 'A3'),
  defaultPlayer(P3, 3, 'C1'),
  defaultPlayer(P4, 4, 'C3'),
];

const DEFAULT_TEST_STATE_OPTIONS: Required<TestStateOptions> = {
  turnNumber: 1,
  players: DEFAULT_PLAYERS,
  zones: {},
  modifiers: [],
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
 * Builds a state on the test map. Unlike `createInitialMatchState`, every zone starts neutral and empty and
 * no modifiers are in play, so each test sets up exactly the position it is about.
 */
export function createTestState(options: TestStateOptions): MatchState {
  const { turnNumber, players, zones, modifiers } = {
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
    modifiers,
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
  via: readonly string[] = [],
): MoveOrder {
  return {
    kind: 'move',
    fromZoneId: toZoneId(from),
    viaZoneIds: via.map(toZoneId),
    toZoneId: toZoneId(to),
    units: createUnitCounts(counts),
  };
}

export function recruitOrder(unitType: UnitType, count: number): RecruitOrder {
  return { kind: 'recruit', unitType, count };
}

export function supportOrder(
  from: string,
  target: string,
  count: number,
): SupportOrder {
  return {
    kind: 'support',
    fromZoneId: toZoneId(from),
    targetZoneId: toZoneId(target),
    count,
  };
}

export function upgradeOrder(upgradeId: string): BuyUpgradeOrder {
  return { kind: 'buyUpgrade', upgradeId };
}

export function abilityOrder(target: AbilityTarget): UseAbilityOrder {
  return { kind: 'useAbility', target };
}

export function ownedZoneTarget(zone: string): AbilityTarget {
  return { kind: 'ownedZone', zoneId: toZoneId(zone) };
}

export function reinforcementTarget(
  from: string,
  to: string,
  counts: Partial<UnitCounts>,
): AbilityTarget {
  return {
    kind: 'reinforcement',
    fromZoneId: toZoneId(from),
    toZoneId: toZoneId(to),
    units: createUnitCounts(counts),
  };
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
