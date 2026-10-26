import type { PlayerId } from '../../core/ids';
import { unitCountsOfSingleType } from '../../core/unit-counts';
import { findCommander } from '../../config/content-queries';
import {
  createAbilityModifier,
  createUpgradeModifier,
} from '../../modifiers/active-modifiers';
import { effectiveParameters } from '../../modifiers/effective-parameters';
import type { EffectiveParameters } from '../../modifiers/parameters';
import type {
  AcceptedOrders,
  BuyUpgradeOrder,
  RecruitOrder,
  UseAbilityOrder,
} from '../../orders/orders';
import { recruitOrderCost } from '../../orders/validate-orders';
import type { MatchState, PlayerState } from '../../state/match-state';
import {
  addUnitsToZone,
  findPlayer,
  updatePlayer,
} from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

/**
 * Pays for recruits and places them at the starting capital, activates bought upgrades, and activates the
 * abilities used tonight. Prices are the ones the orders were validated against.
 */
export function applyPurchasePhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  return context.acceptedOrders.reduce(
    (current, accepted): ResolutionState =>
      applyPlayerPurchases(
        current,
        accepted,
        effectiveParameters(
          resolution.match,
          context.config,
          accepted.playerId,
          null,
        ),
        context,
      ),
    resolution,
  );
}

function applyPlayerPurchases(
  resolution: ResolutionState,
  accepted: AcceptedOrders,
  parameters: EffectiveParameters,
  context: TurnContext,
): ResolutionState {
  const afterRecruits = accepted.recruits.reduce(
    (current, recruit): ResolutionState =>
      applyRecruitOrder(
        current,
        accepted.playerId,
        recruit,
        parameters,
        context,
      ),
    resolution,
  );
  const afterUpgrades = accepted.upgrades.reduce(
    (current, upgrade): ResolutionState =>
      applyUpgradeOrder(
        current,
        accepted.playerId,
        upgrade,
        parameters,
        context,
      ),
    afterRecruits,
  );
  return accepted.abilities.reduce(
    (current, ability): ResolutionState =>
      applyAbilityOrder(current, accepted.playerId, ability, context),
    afterUpgrades,
  );
}

function applyRecruitOrder(
  resolution: ResolutionState,
  playerId: PlayerId,
  recruit: RecruitOrder,
  parameters: EffectiveParameters,
  context: TurnContext,
): ResolutionState {
  const capitalZoneId = findPlayer(
    resolution.match,
    playerId,
  ).startingCapitalZoneId;
  const cost = recruitOrderCost(recruit, parameters);
  return appendEvents(
    resolution,
    addUnitsToZone(
      spendSupply(resolution.match, playerId, cost),
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

function applyUpgradeOrder(
  resolution: ResolutionState,
  playerId: PlayerId,
  upgrade: BuyUpgradeOrder,
  parameters: EffectiveParameters,
  context: TurnContext,
): ResolutionState {
  const paid = spendSupply(resolution.match, playerId, parameters.upgradeCost);
  const recorded = updatePlayer(
    paid,
    playerId,
    (player): PlayerState => ({
      ...player,
      upgrades: [...player.upgrades, upgrade.upgradeId],
    }),
  );
  return appendEvents(
    resolution,
    {
      ...recorded,
      modifiers: [
        ...recorded.modifiers,
        createUpgradeModifier(playerId, upgrade.upgradeId),
      ],
    },
    [
      {
        type: 'UpgradeBought',
        turnNumber: context.turnNumber,
        playerId,
        upgradeId: upgrade.upgradeId,
        cost: parameters.upgradeCost,
      },
    ],
  );
}

function applyAbilityOrder(
  resolution: ResolutionState,
  playerId: PlayerId,
  order: UseAbilityOrder,
  context: TurnContext,
): ResolutionState {
  const commanderId = findPlayer(resolution.match, playerId).commanderId;
  const ability = findCommander(context.config, commanderId).ability;
  const used = updatePlayer(
    resolution.match,
    playerId,
    (player): PlayerState => ({ ...player, abilityUsed: true }),
  );
  return appendEvents(
    resolution,
    {
      ...used,
      modifiers: [
        ...used.modifiers,
        createAbilityModifier(
          playerId,
          commanderId,
          ability,
          order.target,
          context.turnNumber,
        ),
      ],
    },
    [
      {
        type: 'AbilityUsed',
        turnNumber: context.turnNumber,
        playerId,
        commanderId,
        abilityId: ability.id,
        target: order.target,
      },
    ],
  );
}

function spendSupply(
  state: MatchState,
  playerId: PlayerId,
  amount: number,
): MatchState {
  return updatePlayer(
    state,
    playerId,
    (player): PlayerState => ({ ...player, supply: player.supply - amount }),
  );
}
