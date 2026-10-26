import type {
  BattleFormedEvent,
  BattleOutcome,
  BattleResolvedEvent,
  BattleRole,
  FieldBattleEvent,
  PlayerId,
  UnitCounts,
} from '@lunch-campaign/engine';
import { requirePresent, totalUnitCount } from '@lunch-campaign/engine';
import type { MatchRecord } from './match-record';
import { countOf, eventsOfType, sumOf } from './log-queries';

export interface BattleSideRecord {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  /** As the side stood before bombardment. */
  readonly unitsAtStart: UnitCounts;
  /** Lost in combat and to enemy bombardment; units saved by retreat are not lost. */
  readonly unitsLost: number;
  /** Lost in combat only, retreats excluded: what the winner is credited with. */
  readonly unitsLostInCombat: number;
}

/** One battle, zone or head-on clash, joined together from the events that logged it. */
export interface BattleRecord {
  readonly turnNumber: number;
  readonly sides: readonly BattleSideRecord[];
  readonly winnerId: PlayerId | null;
}

interface ZoneBattleKey {
  readonly turnNumber: number;
  readonly zoneId: string;
}

export function battleRecords(record: MatchRecord): readonly BattleRecord[] {
  return [
    ...eventsOfType(record, 'BattleFormed').map(
      (formed): BattleRecord => zoneBattleRecord(record, formed),
    ),
    ...eventsOfType(record, 'FieldBattle').map(fieldBattleRecord),
  ];
}

function fieldBattleRecord(event: FieldBattleEvent): BattleRecord {
  return {
    turnNumber: event.turnNumber,
    sides: event.battle.sides.map(
      (side): BattleSideRecord => ({
        playerId: side.playerId,
        role: side.role,
        unitsAtStart: side.unitsBefore,
        unitsLost: totalUnitCount(side.unitsLost),
        unitsLostInCombat: totalUnitCount(side.unitsLost),
      }),
    ),
    winnerId: winnerOf(event.battle.outcome),
  };
}

function zoneBattleRecord(
  record: MatchRecord,
  formed: BattleFormedEvent,
): BattleRecord {
  const resolved = findResolvedBattle(record, formed);
  return {
    turnNumber: formed.turnNumber,
    sides: formed.sides.map((side): BattleSideRecord => {
      const lostInCombat =
        combatLossesOf(resolved, side.playerId) -
        unitsSavedBy(record, formed, side.playerId);
      return {
        playerId: side.playerId,
        role: side.role,
        unitsAtStart: side.units,
        unitsLost:
          lostInCombat + bombardmentLossesOf(record, formed, side.playerId),
        unitsLostInCombat: lostInCombat,
      };
    }),
    winnerId: zoneBattleWinner(record, formed, resolved),
  };
}

function findResolvedBattle(
  record: MatchRecord,
  key: ZoneBattleKey,
): BattleResolvedEvent | undefined {
  return eventsOfType(record, 'BattleResolved').find((event): boolean =>
    isSameZoneBattle(event, key),
  );
}

/** A battle either reaches combat or is decided by bombardment; the log always says which. */
function zoneBattleWinner(
  record: MatchRecord,
  key: ZoneBattleKey,
  resolved: BattleResolvedEvent | undefined,
): PlayerId | null {
  return resolved === undefined
    ? decidedByBombardment(record, key)
    : winnerOf(resolved.battle.outcome);
}

function decidedByBombardment(
  record: MatchRecord,
  key: ZoneBattleKey,
): PlayerId | null {
  return requirePresent(
    eventsOfType(record, 'BattleDecidedByBombardment').find((event): boolean =>
      isSameZoneBattle(event, key),
    ),
    `outcome of the battle in ${key.zoneId} on turn ${key.turnNumber}`,
  ).survivorId;
}

function combatLossesOf(
  resolved: BattleResolvedEvent | undefined,
  playerId: PlayerId,
): number {
  return resolved === undefined ? 0 : sumOf(lossesOfPlayer(resolved, playerId));
}

function lossesOfPlayer(
  resolved: BattleResolvedEvent,
  playerId: PlayerId,
): readonly number[] {
  return resolved.battle.sides
    .filter((side): boolean => side.playerId === playerId)
    .map((side): number => totalUnitCount(side.unitsLost));
}

function unitsSavedBy(
  record: MatchRecord,
  key: ZoneBattleKey,
  playerId: PlayerId,
): number {
  return sumOf(
    eventsOfType(record, 'Retreated')
      .filter(
        (event): boolean =>
          isRetreatFrom(event, key) && event.playerId === playerId,
      )
      .map((event): number => totalUnitCount(event.units)),
  );
}

function bombardmentLossesOf(
  record: MatchRecord,
  key: ZoneBattleKey,
  playerId: PlayerId,
): number {
  return sumOf(
    eventsOfType(record, 'Bombardment')
      .filter((event): boolean => isBombardmentOf(event, key))
      .map((event): number =>
        countOf(event.hits, (hit): boolean => hit.playerId === playerId),
      ),
  );
}

function isSameZoneBattle(
  event: { readonly turnNumber: number; readonly zoneId: string },
  key: ZoneBattleKey,
): boolean {
  return event.turnNumber === key.turnNumber && event.zoneId === key.zoneId;
}

function isRetreatFrom(
  event: { readonly turnNumber: number; readonly fromZoneId: string },
  key: ZoneBattleKey,
): boolean {
  return event.turnNumber === key.turnNumber && event.fromZoneId === key.zoneId;
}

function isBombardmentOf(
  event: { readonly turnNumber: number; readonly targetZoneId: string },
  key: ZoneBattleKey,
): boolean {
  return (
    event.turnNumber === key.turnNumber && event.targetZoneId === key.zoneId
  );
}

function winnerOf(outcome: BattleOutcome): PlayerId | null {
  return outcome.kind === 'victory' ? outcome.winnerId : null;
}

export function sideOf(
  battle: BattleRecord,
  playerId: PlayerId,
): BattleSideRecord | undefined {
  return battle.sides.find((side): boolean => side.playerId === playerId);
}

export function isWonBy(battle: BattleRecord, playerId: PlayerId): boolean {
  return battle.winnerId === playerId;
}
