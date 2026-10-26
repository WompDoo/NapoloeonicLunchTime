import { removeCasualties } from '../../combat/casualties';
import { subtractUnitCounts, totalUnitCount } from '../../core/unit-counts';
import type { ActiveModifier } from '../../modifiers/active-modifiers';
import type { PhaseStepAction } from '../../modifiers/modifier-definitions';
import { playersAffectedBy } from '../../modifiers/affected-players';
import type { PlayerState } from '../../state/match-state';
import { setPlayerUnitsInZone } from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';
import type { PlacedArmy } from './army-queries';
import { armiesByDescendingSize } from './army-queries';

type ReduceLargestArmyAction = Extract<
  PhaseStepAction,
  { readonly kind: 'reduceLargestArmy' }
>;

/** Products like 0.29 × 100 land a hair below the integer they mean; this keeps floor() from dropping a unit. */
const FLOOR_TOLERANCE = 1e-9;

/**
 * Typhus: every player's largest army (tie: lowest zone id) loses a fraction of its units, rounded down, in
 * removal order. Armies of at least the minimum size always lose at least the minimum loss.
 */
export function applyReduceLargestArmy(
  resolution: ResolutionState,
  context: TurnContext,
  modifier: ActiveModifier,
  action: ReduceLargestArmyAction,
): ResolutionState {
  return playersAffectedBy(resolution.match, modifier).reduce(
    (current, player): ResolutionState =>
      armiesByDescendingSize(current.match, player.playerId)
        .slice(0, 1)
        .filter(
          (army): boolean =>
            countLosses(totalUnitCount(army.units), action) > 0,
        )
        .reduce(
          (afterArmy, army): ResolutionState =>
            reduceArmy(afterArmy, player, army, modifier, action, context),
          current,
        ),
    resolution,
  );
}

function reduceArmy(
  resolution: ResolutionState,
  player: PlayerState,
  army: PlacedArmy,
  modifier: ActiveModifier,
  action: ReduceLargestArmyAction,
  context: TurnContext,
): ResolutionState {
  const remaining = removeCasualties(
    army.units,
    countLosses(totalUnitCount(army.units), action),
    context.config.combat.casualtyRemovalOrder,
  );
  return appendEvents(
    resolution,
    setPlayerUnitsInZone(
      resolution.match,
      army.zoneId,
      player.playerId,
      remaining,
    ),
    [
      {
        type: 'UnitsLostToModifier',
        turnNumber: context.turnNumber,
        playerId: player.playerId,
        zoneId: army.zoneId,
        units: subtractUnitCounts(army.units, remaining),
        modifierId: modifier.id,
      },
    ],
  );
}

export function countLosses(
  armySize: number,
  action: ReduceLargestArmyAction,
): number {
  const proportionalLoss = Math.floor(
    armySize * action.lossFraction + FLOOR_TOLERANCE,
  );
  return armySize >= action.minimumArmySizeForMinimumLoss
    ? Math.max(proportionalLoss, action.minimumLoss)
    : proportionalLoss;
}
