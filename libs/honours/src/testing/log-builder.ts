import type {
  BattleDecidedByBombardmentEvent,
  BattleFormedEvent,
  BattleOutcome,
  BattleResolvedEvent,
  BattleRole,
  BattleSideResult,
  BombardmentEvent,
  FieldBattleEvent,
  PlayerId,
  PointsAwardedEvent,
  ReplayEvent,
  RetreatedEvent,
  StandingsRecordedEvent,
  SupplyProducedEvent,
  UnitCounts,
  ZoneCapturedEvent,
} from '@lunch-campaign/engine';
import {
  createUnitCounts,
  subtractUnitCounts,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/engine';
import type { MatchRecord } from '../lib/match-record';

/*
 * Hand-built replay events, so honour tests control exactly the facts each query reads. Only the fields
 * honours use are meaningful; strength breakdowns are left empty.
 */

export const P1 = toPlayerId('p1');
export const P2 = toPlayerId('p2');
export const P3 = toPlayerId('p3');

export function record(
  replayLog: readonly ReplayEvent[],
  spiedBy?: readonly PlayerId[],
): MatchRecord {
  return {
    replayLog,
    spyLog: [...(spiedBy ?? [])].map((playerId) => ({ playerId })),
  };
}

export interface StandingRow {
  readonly playerId: PlayerId;
  readonly units?: number;
  readonly zonesOwned?: number;
  readonly citiesHeld?: number;
}

export function standings(
  turnNumber: number,
  rows: readonly StandingRow[],
): StandingsRecordedEvent {
  return {
    type: 'StandingsRecorded',
    turnNumber,
    standings: rows.map((row) => ({
      units: 0,
      zonesOwned: 0,
      citiesHeld: 0,
      ...row,
      score: 0,
      eliminated: false,
    })),
  };
}

export interface SideSetup {
  readonly playerId: PlayerId;
  readonly role?: BattleRole;
  readonly units: Partial<UnitCounts>;
  /** Units left after combat; defaults to none. */
  readonly remaining?: Partial<UnitCounts>;
}

export function formed(
  turnNumber: number,
  zone: string,
  sides: readonly SideSetup[],
): BattleFormedEvent {
  return {
    type: 'BattleFormed',
    turnNumber,
    zoneId: toZoneId(zone),
    sides: sides.map((side) => {
      const { playerId, role, units } = { ...ATTACKING, ...side };
      return { playerId, role, units: createUnitCounts(units) };
    }),
  };
}

export function resolved(
  turnNumber: number,
  zone: string,
  sides: readonly SideSetup[],
  winnerId: PlayerId | null,
): BattleResolvedEvent {
  return {
    type: 'BattleResolved',
    turnNumber,
    zoneId: toZoneId(zone),
    battle: battleOf(sides, winnerId),
  };
}

export function field(
  turnNumber: number,
  sides: readonly SideSetup[],
  winnerId: PlayerId | null,
): FieldBattleEvent {
  return {
    type: 'FieldBattle',
    turnNumber,
    connection: [toZoneId('A1'), toZoneId('A2')],
    battle: battleOf(sides, winnerId),
  };
}

export function decided(
  turnNumber: number,
  zone: string,
  survivorId: PlayerId | null,
): BattleDecidedByBombardmentEvent {
  return {
    type: 'BattleDecidedByBombardment',
    turnNumber,
    zoneId: toZoneId(zone),
    survivorId,
  };
}

export function bombardment(
  turnNumber: number,
  playerId: PlayerId,
  targetZone: string,
  hitPlayerIds: readonly PlayerId[],
): BombardmentEvent {
  return {
    type: 'Bombardment',
    turnNumber,
    playerId,
    fromZoneId: toZoneId('A1'),
    targetZoneId: toZoneId(targetZone),
    artillery: hitPlayerIds.length,
    hits: hitPlayerIds.map((hitPlayerId) => ({
      playerId: hitPlayerId,
      unitType: 'line',
    })),
    blockedHits: 0,
    wastedHits: 0,
  };
}

export function retreated(
  turnNumber: number,
  playerId: PlayerId,
  fromZone: string,
  units: Partial<UnitCounts>,
): RetreatedEvent {
  return {
    type: 'Retreated',
    turnNumber,
    playerId,
    fromZoneId: toZoneId(fromZone),
    toZoneId: toZoneId('A1'),
    units: createUnitCounts(units),
  };
}

export function supply(
  turnNumber: number,
  playerId: PlayerId,
  amount: number,
): SupplyProducedEvent {
  return { type: 'SupplyProduced', turnNumber, playerId, amount };
}

export function captured(
  turnNumber: number,
  zone: string,
  newOwnerId: PlayerId,
): ZoneCapturedEvent {
  return {
    type: 'ZoneCaptured',
    turnNumber,
    zoneId: toZoneId(zone),
    previousOwnerId: null,
    newOwnerId,
  };
}

export function points(
  turnNumber: number,
  playerId: PlayerId,
  awarded: number,
): PointsAwardedEvent {
  return {
    type: 'PointsAwarded',
    turnNumber,
    playerId,
    source: 'cityPoints',
    citiesHeld: 0,
    points: awarded,
  };
}

const ATTACKING: {
  readonly role: BattleRole;
  readonly remaining: Partial<UnitCounts>;
} = {
  role: 'attacker',
  remaining: {},
};

function battleOf(
  sides: readonly SideSetup[],
  winnerId: PlayerId | null,
): BattleResolvedEvent['battle'] {
  return {
    outcome: outcomeOf(winnerId),
    sides: sides.map((setup): BattleSideResult => {
      const side = { ...ATTACKING, ...setup };
      const before = createUnitCounts(side.units);
      const remaining = createUnitCounts(side.remaining);
      return {
        playerId: side.playerId,
        role: side.role,
        unitsBefore: before,
        unitsLost: subtractUnitCounts(before, remaining),
        unitsRemaining: remaining,
        strength: {
          contributions: [],
          baseStrength: 0,
          bonuses: [],
          totalStrength: 0,
        },
      };
    }),
  };
}

function outcomeOf(winnerId: PlayerId | null): BattleOutcome {
  return winnerId === null
    ? { kind: 'mutualDestruction' }
    : { kind: 'victory', winnerId };
}
