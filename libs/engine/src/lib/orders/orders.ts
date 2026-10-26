import type { PlayerId, ZoneId } from '../core/ids';
import type { UnitCounts, UnitType } from '../core/unit-types';
import type { AbilityTarget } from '../modifiers/ability-target';

export interface RecruitOrder {
  readonly kind: 'recruit';
  readonly unitType: UnitType;
  readonly count: number;
}

export interface MoveOrder {
  readonly kind: 'move';
  readonly fromZoneId: ZoneId;
  /** Zones passed through on the way, for units whose move range is above 1 (Murat's cavalry). */
  readonly viaZoneIds: readonly ZoneId[];
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

/** Artillery that holds in `fromZoneId` and bombards a battle involving its owner in an adjacent zone. */
export interface SupportOrder {
  readonly kind: 'support';
  readonly fromZoneId: ZoneId;
  readonly targetZoneId: ZoneId;
  readonly count: number;
}

export interface BuyUpgradeOrder {
  readonly kind: 'buyUpgrade';
  readonly upgradeId: string;
}

export interface UseAbilityOrder {
  readonly kind: 'useAbility';
  readonly target: AbilityTarget;
}

export type Order =
  | RecruitOrder
  | MoveOrder
  | SupportOrder
  | BuyUpgradeOrder
  | UseAbilityOrder;

/** A player's final submission for the turn, in the order the player listed it. */
export interface PlayerOrders {
  readonly playerId: PlayerId;
  readonly orders: readonly Order[];
}

export type OrderRejectionReason =
  | 'playerEliminated'
  | 'invalidUnitCount'
  | 'startingCapitalNotOwned'
  | 'insufficientSupply'
  | 'unknownZone'
  | 'zonesNotAdjacent'
  | 'beyondMoveRange'
  | 'routeBlocked'
  | 'insufficientUnits'
  | 'moveOrderLimitReached'
  | 'unknownUpgrade'
  | 'upgradeAlreadyOwned'
  | 'abilityAlreadyUsed'
  | 'wrongAbilityTarget'
  | 'zoneNotOwned';

export interface OrderRejection {
  readonly playerId: PlayerId;
  /** Position of the order in the player's submission. */
  readonly orderIndex: number;
  readonly order: Order;
  readonly reason: OrderRejectionReason;
}

/** The orders that survived validation, per player, in submission order. */
export interface AcceptedOrders {
  readonly playerId: PlayerId;
  readonly recruits: readonly RecruitOrder[];
  readonly moves: readonly MoveOrder[];
  readonly supports: readonly SupportOrder[];
  readonly upgrades: readonly BuyUpgradeOrder[];
  /** At most one: the ability is used once per match. */
  readonly abilities: readonly UseAbilityOrder[];
}

export interface OrderValidationResult {
  /** One entry per player in the match, sorted by seat. Players who submitted nothing hold everything. */
  readonly accepted: readonly AcceptedOrders[];
  readonly rejections: readonly OrderRejection[];
}

export function noAcceptedOrders(playerId: PlayerId): AcceptedOrders {
  return {
    playerId,
    recruits: [],
    moves: [],
    supports: [],
    upgrades: [],
    abilities: [],
  };
}

/** Every zone a move passes through, from start to destination. */
export function moveRoute(order: MoveOrder): readonly ZoneId[] {
  return [order.fromZoneId, ...order.viaZoneIds, order.toZoneId];
}
