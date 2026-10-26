import type { PlayerId, ZoneId } from '../core/ids';
import type { UnitCounts, UnitType } from '../core/unit-types';

export interface RecruitOrder {
  readonly kind: 'recruit';
  readonly unitType: UnitType;
  readonly count: number;
}

export interface MoveOrder {
  readonly kind: 'move';
  readonly fromZoneId: ZoneId;
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

export type Order = RecruitOrder | MoveOrder;

/** A player's final submission for the turn, in the order the player listed it. */
export interface PlayerOrders {
  readonly playerId: PlayerId;
  readonly orders: readonly Order[];
}

export type OrderRejectionReason =
  | 'invalidUnitCount'
  | 'startingCapitalNotOwned'
  | 'insufficientSupply'
  | 'unknownZone'
  | 'zonesNotAdjacent'
  | 'insufficientUnits'
  | 'moveOrderLimitReached';

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
}

export interface OrderValidationResult {
  /** One entry per player in the match, sorted by seat. Players who submitted nothing hold everything. */
  readonly accepted: readonly AcceptedOrders[];
  readonly rejections: readonly OrderRejection[];
}
