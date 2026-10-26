import { findZoneDefinition } from '../../map/map-queries';
import { effectiveParameters } from '../../modifiers/effective-parameters';
import type { SupplyProducedEvent } from '../../replay/replay-events';
import { activePlayers } from '../../state/active-players';
import type {
  MatchState,
  PlayerState,
  ZoneState,
} from '../../state/match-state';
import { updatePlayer } from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

interface PlayerProduction {
  readonly player: PlayerState;
  readonly amount: number;
}

/**
 * Every owned zone, occupied or not, produces supply for its owner at its kind's rate, scaled by the zone's
 * production factor (Scorched Earth sets it to 0). Production-phase hooks such as Typhus run before this.
 */
export function applyProductionPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const productions = activePlayers(resolution.match).map(
    (player): PlayerProduction => ({
      player,
      amount: countSupplyProduced(resolution.match, player, context),
    }),
  );
  return appendEvents(
    resolution,
    productions.reduce(
      (state, { player, amount }): MatchState =>
        updatePlayer(
          state,
          player.playerId,
          (current): PlayerState => ({
            ...current,
            supply: current.supply + amount,
          }),
        ),
      resolution.match,
    ),
    productions.map(
      ({ player, amount }): SupplyProducedEvent => ({
        type: 'SupplyProduced',
        turnNumber: context.turnNumber,
        playerId: player.playerId,
        amount,
      }),
    ),
  );
}

function countSupplyProduced(
  state: MatchState,
  player: PlayerState,
  context: TurnContext,
): number {
  return state.zones
    .filter((zone): boolean => zone.ownerId === player.playerId)
    .reduce(
      (total, zone): number =>
        total + zoneProduction(state, player, zone, context),
      0,
    );
}

function zoneProduction(
  state: MatchState,
  player: PlayerState,
  zone: ZoneState,
  context: TurnContext,
): number {
  const baseProduction =
    context.config.economy.productionByZoneKind[
      findZoneDefinition(context.config.map, zone.zoneId).kind
    ];
  return (
    baseProduction *
    effectiveParameters(state, context.config, player.playerId, zone.zoneId)
      .productionFactor
  );
}
