import type { ZoneId } from '../../core/ids';
import { isCityZone } from '../../map/map-queries';
import type { ActiveModifier } from '../../modifiers/active-modifiers';
import type { PhaseStepAction } from '../../modifiers/modifier-definitions';
import type { UnitsGrantedEvent } from '../../replay/replay-events';
import { playersAffectedBy } from '../../modifiers/affected-players';
import type { MatchState, PlayerState } from '../../state/match-state';
import { addUnitsToZone, findZone } from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';
import { armiesByDescendingSize } from './army-queries';

type GrantFreeUnitsAction = Extract<
  PhaseStepAction,
  { readonly kind: 'grantFreeUnits' }
>;

/**
 * Levée en masse: every player the modifier applies to gets free units at their starting capital; without it, at the
 * lowest-id city they own; without a city, in their largest army (tie: lowest zone id). Otherwise nothing.
 */
export function applyGrantFreeUnits(
  resolution: ResolutionState,
  context: TurnContext,
  modifier: ActiveModifier,
  action: GrantFreeUnitsAction,
): ResolutionState {
  return playersAffectedBy(resolution.match, modifier).reduce(
    (current, player): ResolutionState =>
      grantToPlayer(current, player, modifier, action, context),
    resolution,
  );
}

function grantToPlayer(
  resolution: ResolutionState,
  player: PlayerState,
  modifier: ActiveModifier,
  action: GrantFreeUnitsAction,
  context: TurnContext,
): ResolutionState {
  return grantDestinations(resolution.match, player, context)
    .slice(0, 1)
    .reduce(
      (current, zoneId): ResolutionState =>
        appendEvents(
          current,
          addUnitsToZone(current.match, zoneId, player.playerId, action.units),
          [toUnitsGrantedEvent(player, zoneId, modifier, action, context)],
        ),
      resolution,
    );
}

/** Candidate destinations in order of preference. */
function grantDestinations(
  state: MatchState,
  player: PlayerState,
  context: TurnContext,
): readonly ZoneId[] {
  return [
    ...[player.startingCapitalZoneId].filter(
      (zoneId): boolean => findZone(state, zoneId).ownerId === player.playerId,
    ),
    ...state.zones
      .filter(
        (zone): boolean =>
          zone.ownerId === player.playerId &&
          isCityZone(context.config.map, zone.zoneId),
      )
      .map((zone): ZoneId => zone.zoneId),
    ...armiesByDescendingSize(state, player.playerId).map(
      (army): ZoneId => army.zoneId,
    ),
  ];
}

function toUnitsGrantedEvent(
  player: PlayerState,
  zoneId: ZoneId,
  modifier: ActiveModifier,
  action: GrantFreeUnitsAction,
  context: TurnContext,
): UnitsGrantedEvent {
  return {
    type: 'UnitsGranted',
    turnNumber: context.turnNumber,
    playerId: player.playerId,
    zoneId,
    units: action.units,
    modifierId: modifier.id,
  };
}
