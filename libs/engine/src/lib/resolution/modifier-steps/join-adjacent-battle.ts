import { EngineContractError } from '../../core/engine-error';
import type { PlayerId } from '../../core/ids';
import { subtractUnitCounts } from '../../core/unit-counts';
import type { AbilityTarget } from '../../modifiers/ability-target';
import type { ActiveModifier } from '../../modifiers/active-modifiers';
import type { MatchState, ZoneState } from '../../state/match-state';
import {
  addUnitsToZone,
  findZone,
  setPlayerUnitsInZone,
  unitsOfPlayerInZone,
} from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

type ReinforcementTarget = Extract<
  AbilityTarget,
  { readonly kind: 'reinforcement' }
>;

const ARMIES_NEEDED_FOR_BATTLE = 2;

/**
 * Marschall Vorwärts: units of an army that held join a battle in an adjacent zone where their owner attacks
 * or defends. Only from a zone with no battle of its own tonight; otherwise the ability has no effect (and is
 * still used up).
 */
export function applyJoinAdjacentBattle(
  resolution: ResolutionState,
  context: TurnContext,
  modifier: ActiveModifier,
): ResolutionState {
  const playerId = requireOwner(modifier);
  const target = requireReinforcementTarget(modifier.target);
  return canJoin(resolution.match, playerId, target)
    ? joinBattle(resolution, playerId, target, modifier, context)
    : appendEvents(resolution, resolution.match, [
        {
          type: 'AbilityHadNoEffect',
          turnNumber: context.turnNumber,
          playerId,
          modifierId: modifier.id,
        },
      ]);
}

function canJoin(
  state: MatchState,
  playerId: PlayerId,
  target: ReinforcementTarget,
): boolean {
  return (
    isBattleInvolving(findZone(state, target.toZoneId), playerId) &&
    !hasBattle(findZone(state, target.fromZoneId))
  );
}

function isBattleInvolving(zone: ZoneState, playerId: PlayerId): boolean {
  return (
    hasBattle(zone) &&
    zone.armies.some((army): boolean => army.playerId === playerId)
  );
}

function hasBattle(zone: ZoneState): boolean {
  return zone.armies.length >= ARMIES_NEEDED_FOR_BATTLE;
}

function joinBattle(
  resolution: ResolutionState,
  playerId: PlayerId,
  target: ReinforcementTarget,
  modifier: ActiveModifier,
  context: TurnContext,
): ResolutionState {
  const unitsAtHome = unitsOfPlayerInZone(
    findZone(resolution.match, target.fromZoneId),
    playerId,
  );
  const departed = setPlayerUnitsInZone(
    resolution.match,
    target.fromZoneId,
    playerId,
    subtractUnitCounts(unitsAtHome, target.units),
  );
  return appendEvents(
    resolution,
    addUnitsToZone(departed, target.toZoneId, playerId, target.units),
    [
      {
        type: 'ReinforcementsJoined',
        turnNumber: context.turnNumber,
        playerId,
        fromZoneId: target.fromZoneId,
        toZoneId: target.toZoneId,
        units: target.units,
        modifierId: modifier.id,
      },
    ],
  );
}

function requireOwner(modifier: ActiveModifier): PlayerId {
  if (modifier.ownerId === null) {
    throw new EngineContractError(
      `Modifier ${modifier.id} joins battles but belongs to no player`,
    );
  }
  return modifier.ownerId;
}

function requireReinforcementTarget(
  target: AbilityTarget,
): ReinforcementTarget {
  if (target.kind !== 'reinforcement') {
    throw new EngineContractError(
      `Joining a battle needs a reinforcement target, not ${target.kind}`,
    );
  }
  return target;
}
