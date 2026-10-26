import type { PlayerId, ZoneId } from '../../core/ids';
import { hasAnyUnits, mapUnitTypes } from '../../core/unit-counts';
import type { UnitCounts } from '../../core/unit-types';
import { COMBAT_UNIT_TYPES } from '../../core/unit-types';
import type {
  BattleOutcome,
  BattleResult,
  BattleSideResult,
} from '../../combat/battle';
import { resolveBattle } from '../../combat/resolve-battle';
import { adjacentZoneIds } from '../../map/map-queries';
import { effectiveParameters } from '../../modifiers/effective-parameters';
import type { Army, ZoneState } from '../../state/match-state';
import {
  addUnitsToZone,
  findZone,
  updateZone,
} from '../../state/match-state-queries';
import { createZoneBattleSides } from '../battle-sides';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

const ARMIES_NEEDED_FOR_BATTLE = 2;
const UNITS_SAVED_PER_COMBAT_TYPE = 1;

/** Every zone holding armies of two or more players fights one battle, in zone id order. */
export function applyCombatPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const battleZoneIds = resolution.match.zones
    .filter((zone): boolean => zone.armies.length >= ARMIES_NEEDED_FOR_BATTLE)
    .map((zone): ZoneId => zone.zoneId);
  return battleZoneIds.reduce(
    (current, zoneId): ResolutionState =>
      resolveBattleInZone(current, zoneId, battleZoneIds, context),
    resolution,
  );
}

function resolveBattleInZone(
  resolution: ResolutionState,
  zoneId: ZoneId,
  battleZoneIds: readonly ZoneId[],
  context: TurnContext,
): ResolutionState {
  const zone = findZone(resolution.match, zoneId);
  const battle = resolveBattle(
    createZoneBattleSides(resolution.match, context.config, zone),
    context.config.combat,
  );
  const afterBattle = appendEvents(
    resolution,
    updateZone(
      resolution.match,
      zoneId,
      (current): ZoneState => ({ ...current, armies: survivingArmies(battle) }),
    ),
    [
      {
        type: 'BattleResolved',
        turnNumber: context.turnNumber,
        zoneId,
        battle,
      },
    ],
  );
  return battle.sides
    .filter((side): boolean => hasLost(side, battle.outcome))
    .reduce(
      (current, side): ResolutionState =>
        retreatIfOrderly(current, zoneId, side, battleZoneIds, context),
      afterBattle,
    );
}

function survivingArmies(battle: BattleResult): readonly Army[] {
  return battle.sides
    .filter((side): boolean => hasAnyUnits(side.unitsRemaining))
    .map(
      (side): Army => ({ playerId: side.playerId, units: side.unitsRemaining }),
    );
}

/** Every side that doesn't win loses, including every side in a mutual destruction. */
function hasLost(side: BattleSideResult, outcome: BattleOutcome): boolean {
  return (
    outcome.kind === 'mutualDestruction' || outcome.winnerId !== side.playerId
  );
}

/**
 * With Orderly Retreat, one unit of each combat type the loser had survives and falls back to the
 * lowest-id adjacent zone it owns that is not a battle area. With no such zone, they are destroyed.
 */
function retreatIfOrderly(
  resolution: ResolutionState,
  zoneId: ZoneId,
  side: BattleSideResult,
  battleZoneIds: readonly ZoneId[],
  context: TurnContext,
): ResolutionState {
  const units = retreatingUnits(side.unitsBefore);
  return canRetreat(resolution, zoneId, side.playerId, units, context)
    ? retreat(resolution, zoneId, side.playerId, units, battleZoneIds, context)
    : resolution;
}

function canRetreat(
  resolution: ResolutionState,
  zoneId: ZoneId,
  playerId: PlayerId,
  units: UnitCounts,
  context: TurnContext,
): boolean {
  return (
    effectiveParameters(resolution.match, context.config, playerId, zoneId)
      .orderlyRetreat && hasAnyUnits(units)
  );
}

function retreat(
  resolution: ResolutionState,
  zoneId: ZoneId,
  playerId: PlayerId,
  units: UnitCounts,
  battleZoneIds: readonly ZoneId[],
  context: TurnContext,
): ResolutionState {
  const destination = adjacentZoneIds(context.config.map, zoneId).find(
    (candidate): boolean =>
      isSafeRetreatZone(
        findZone(resolution.match, candidate),
        playerId,
        battleZoneIds,
      ),
  );
  return destination === undefined
    ? appendEvents(resolution, resolution.match, [
        {
          type: 'RetreatBlocked',
          turnNumber: context.turnNumber,
          playerId,
          zoneId,
          units,
        },
      ])
    : appendEvents(
        resolution,
        addUnitsToZone(resolution.match, destination, playerId, units),
        [
          {
            type: 'Retreated',
            turnNumber: context.turnNumber,
            playerId,
            fromZoneId: zoneId,
            toZoneId: destination,
            units,
          },
        ],
      );
}

function retreatingUnits(unitsBefore: UnitCounts): UnitCounts {
  return mapUnitTypes((unitType): number =>
    COMBAT_UNIT_TYPES.some((combatType): boolean => combatType === unitType)
      ? Math.min(unitsBefore[unitType], UNITS_SAVED_PER_COMBAT_TYPE)
      : 0,
  );
}

function isSafeRetreatZone(
  zone: ZoneState,
  playerId: PlayerId,
  battleZoneIds: readonly ZoneId[],
): boolean {
  return (
    zone.ownerId === playerId &&
    isOutsideBattleArea(zone, playerId, battleZoneIds)
  );
}

/** A battle area is a zone with a battle tonight or one holding another player's units. */
function isOutsideBattleArea(
  zone: ZoneState,
  playerId: PlayerId,
  battleZoneIds: readonly ZoneId[],
): boolean {
  return (
    !battleZoneIds.includes(zone.zoneId) &&
    zone.armies.every((army): boolean => army.playerId === playerId)
  );
}
