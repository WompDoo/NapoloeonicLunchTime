import { findZoneDefinition } from '../../map/map-queries';
import type { SupplyProducedEvent } from '../../replay/replay-events';
import type { MatchState, PlayerState } from '../../state/match-state';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

interface PlayerProduction {
  readonly player: PlayerState;
  readonly amount: number;
}

/** Every owned zone, occupied or not, produces supply for its owner at its kind's rate. */
export function applyProductionPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const productions = resolution.match.players.map(
    (player): PlayerProduction => ({
      player,
      amount: countSupplyProduced(resolution.match, player, context),
    }),
  );
  return appendEvents(
    resolution,
    {
      ...resolution.match,
      players: productions.map(
        ({ player, amount }): PlayerState => ({
          ...player,
          supply: player.supply + amount,
        }),
      ),
    },
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
        total +
        context.config.economy.productionByZoneKind[
          findZoneDefinition(context.config.map, zone.zoneId).kind
        ],
      0,
    );
}
