import type { PlayerId, ZoneId } from '../core/ids';
import type { UnitCounts, UnitType } from '../core/unit-types';
import type { BattleResult } from '../combat/battle';
import type { ZoneConnection } from '../map/map-definition';
import type { Order, OrderRejectionReason } from '../orders/orders';

interface ReplayEventBase {
  readonly turnNumber: number;
}

export interface OrderRejectedEvent extends ReplayEventBase {
  readonly type: 'OrderRejected';
  readonly playerId: PlayerId;
  readonly orderIndex: number;
  readonly order: Order;
  readonly reason: OrderRejectionReason;
}

export interface UnitsRecruitedEvent extends ReplayEventBase {
  readonly type: 'UnitsRecruited';
  readonly playerId: PlayerId;
  readonly zoneId: ZoneId;
  readonly unitType: UnitType;
  readonly count: number;
  readonly cost: number;
}

export interface ArmyMovedEvent extends ReplayEventBase {
  readonly type: 'ArmyMoved';
  readonly playerId: PlayerId;
  readonly fromZoneId: ZoneId;
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

/** A head-on clash: two groups crossing the same connection in opposite directions. */
export interface FieldBattleEvent extends ReplayEventBase {
  readonly type: 'FieldBattle';
  readonly connection: ZoneConnection;
  readonly battle: BattleResult;
}

export interface BattleResolvedEvent extends ReplayEventBase {
  readonly type: 'BattleResolved';
  readonly zoneId: ZoneId;
  readonly battle: BattleResult;
}

export interface ZoneCapturedEvent extends ReplayEventBase {
  readonly type: 'ZoneCaptured';
  readonly zoneId: ZoneId;
  readonly previousOwnerId: PlayerId | null;
  readonly newOwnerId: PlayerId;
}

export interface SupplyProducedEvent extends ReplayEventBase {
  readonly type: 'SupplyProduced';
  readonly playerId: PlayerId;
  readonly amount: number;
}

export interface PointsAwardedEvent extends ReplayEventBase {
  readonly type: 'PointsAwarded';
  readonly playerId: PlayerId;
  readonly source: 'cityPoints';
  readonly citiesHeld: number;
  readonly points: number;
}

export type ReplayEvent =
  | OrderRejectedEvent
  | UnitsRecruitedEvent
  | ArmyMovedEvent
  | FieldBattleEvent
  | BattleResolvedEvent
  | ZoneCapturedEvent
  | SupplyProducedEvent
  | PointsAwardedEvent;
