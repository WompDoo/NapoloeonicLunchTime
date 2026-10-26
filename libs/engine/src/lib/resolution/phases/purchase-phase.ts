import type { PlayerId } from '../../core/ids';
import { unitCountsOfSingleType } from '../../core/unit-counts';
import type { RecruitOrder } from '../../orders/orders';
import type { PlayerState } from '../../state/match-state';
import { recruitOrderCost } from '../../orders/validate-orders';
import {
  addUnitsToZone,
  findPlayer,
  updatePlayer,
} from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

/** Pays for recruits and places them at the recruiting player's starting capital. */
export function applyPurchasePhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  return context.acceptedOrders.reduce(
    (current, accepted): ResolutionState =>
      accepted.recruits.reduce(
        (afterRecruit, recruit): ResolutionState =>
          applyRecruitOrder(afterRecruit, accepted.playerId, recruit, context),
        current,
      ),
    resolution,
  );
}

function applyRecruitOrder(
  resolution: ResolutionState,
  playerId: PlayerId,
  recruit: RecruitOrder,
  context: TurnContext,
): ResolutionState {
  const capitalZoneId = findPlayer(
    resolution.match,
    playerId,
  ).startingCapitalZoneId;
  const cost = recruitOrderCost(recruit, context.config);
  const paid = updatePlayer(
    resolution.match,
    playerId,
    (player): PlayerState => ({ ...player, supply: player.supply - cost }),
  );
  return appendEvents(
    resolution,
    addUnitsToZone(
      paid,
      capitalZoneId,
      playerId,
      unitCountsOfSingleType(recruit.unitType, recruit.count),
    ),
    [
      {
        type: 'UnitsRecruited',
        turnNumber: context.turnNumber,
        playerId,
        zoneId: capitalZoneId,
        unitType: recruit.unitType,
        count: recruit.count,
        cost,
      },
    ],
  );
}
