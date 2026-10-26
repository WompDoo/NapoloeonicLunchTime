import type { PlayerId, ZoneId } from '../core/ids';
import type { UnitCounts, UnitType } from '../core/unit-types';
import type { BattleResult, BattleRole } from '../combat/battle';
import type { ZoneConnection } from '../map/map-definition';
import type { AbilityTarget } from '../modifiers/ability-target';
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

export interface UpgradeBoughtEvent extends ReplayEventBase {
  readonly type: 'UpgradeBought';
  readonly playerId: PlayerId;
  readonly upgradeId: string;
  readonly cost: number;
}

/** Abilities stay hidden until resolution; this reveals one in the replay. */
export interface AbilityUsedEvent extends ReplayEventBase {
  readonly type: 'AbilityUsed';
  readonly playerId: PlayerId;
  readonly commanderId: string;
  readonly abilityId: string;
  readonly target: AbilityTarget;
}

/** An ability whose condition wasn't met that night. It is still used up. */
export interface AbilityHadNoEffectEvent extends ReplayEventBase {
  readonly type: 'AbilityHadNoEffect';
  readonly playerId: PlayerId;
  readonly modifierId: string;
}

/** Free units from a modifier (Levée en masse). */
export interface UnitsGrantedEvent extends ReplayEventBase {
  readonly type: 'UnitsGranted';
  readonly playerId: PlayerId;
  readonly zoneId: ZoneId;
  readonly units: UnitCounts;
  readonly modifierId: string;
}

export interface ArmyMovedEvent extends ReplayEventBase {
  readonly type: 'ArmyMoved';
  readonly playerId: PlayerId;
  readonly fromZoneId: ZoneId;
  readonly viaZoneIds: readonly ZoneId[];
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

/** A move that stayed home because a modifier (Armistice) bounced it. */
export interface MoveBouncedEvent extends ReplayEventBase {
  readonly type: 'MoveBounced';
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

/** Units that joined a battle in the reinforcement phase (Marschall Vorwärts). */
export interface ReinforcementsJoinedEvent extends ReplayEventBase {
  readonly type: 'ReinforcementsJoined';
  readonly playerId: PlayerId;
  readonly fromZoneId: ZoneId;
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
  readonly modifierId: string;
}

export interface BattleFormedSide {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  readonly units: UnitCounts;
}

/** Armies of two or more players met in a zone. Logged before bombardment, with the compositions as they stood. */
export interface BattleFormedEvent extends ReplayEventBase {
  readonly type: 'BattleFormed';
  readonly zoneId: ZoneId;
  readonly sides: readonly BattleFormedSide[];
}

/** Bombardment left fewer than two armies, so the battle ends before combat. `null`: nobody is left standing. */
export interface BattleDecidedByBombardmentEvent extends ReplayEventBase {
  readonly type: 'BattleDecidedByBombardment';
  readonly zoneId: ZoneId;
  readonly survivorId: PlayerId | null;
}

export interface BombardmentHit {
  readonly playerId: PlayerId;
  readonly unitType: UnitType;
}

/** One support order firing. Revealed, with its zone and count, to every player in that battle. */
export interface BombardmentEvent extends ReplayEventBase {
  readonly type: 'Bombardment';
  readonly playerId: PlayerId;
  readonly fromZoneId: ZoneId;
  readonly targetZoneId: ZoneId;
  readonly artillery: number;
  readonly hits: readonly BombardmentHit[];
  /** Hits stopped by a shield (Reverse Slope). */
  readonly blockedHits: number;
  /** Hits with nothing left to hit. */
  readonly wastedHits: number;
}

export interface BattleResolvedEvent extends ReplayEventBase {
  readonly type: 'BattleResolved';
  readonly zoneId: ZoneId;
  readonly battle: BattleResult;
}

/** Units saved by Orderly Retreat. */
export interface RetreatedEvent extends ReplayEventBase {
  readonly type: 'Retreated';
  readonly playerId: PlayerId;
  readonly fromZoneId: ZoneId;
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

/** Orderly Retreat with no safe zone to retreat to: the units are destroyed. */
export interface RetreatBlockedEvent extends ReplayEventBase {
  readonly type: 'RetreatBlocked';
  readonly playerId: PlayerId;
  readonly zoneId: ZoneId;
  readonly units: UnitCounts;
}

export interface ZoneCapturedEvent extends ReplayEventBase {
  readonly type: 'ZoneCaptured';
  readonly zoneId: ZoneId;
  readonly previousOwnerId: PlayerId | null;
  readonly newOwnerId: PlayerId;
}

/** Units lost outside battle to a modifier (Typhus). */
export interface UnitsLostToModifierEvent extends ReplayEventBase {
  readonly type: 'UnitsLostToModifier';
  readonly playerId: PlayerId;
  readonly zoneId: ZoneId;
  readonly units: UnitCounts;
  readonly modifierId: string;
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

export interface PlayerEliminatedEvent extends ReplayEventBase {
  readonly type: 'PlayerEliminated';
  readonly playerId: PlayerId;
}

/** A modifier whose last night has been resolved (an ability or event wearing off). */
export interface ModifierExpiredEvent extends ReplayEventBase {
  readonly type: 'ModifierExpired';
  readonly modifierId: string;
}

export interface PlayerStanding {
  readonly playerId: PlayerId;
  readonly units: number;
  readonly zonesOwned: number;
  readonly citiesHeld: number;
  readonly score: number;
  readonly eliminated: boolean;
}

/** Public standings at the end of every night, in seat order. The last one is the final standings. */
export interface StandingsRecordedEvent extends ReplayEventBase {
  readonly type: 'StandingsRecorded';
  readonly standings: readonly PlayerStanding[];
}

/** Announced the night before the event is active. */
export interface EventAnnouncedEvent extends ReplayEventBase {
  readonly type: 'EventAnnounced';
  readonly eventId: string;
  readonly activeTurnNumber: number;
}

export type ReplayEvent =
  | OrderRejectedEvent
  | UnitsRecruitedEvent
  | UpgradeBoughtEvent
  | AbilityUsedEvent
  | AbilityHadNoEffectEvent
  | UnitsGrantedEvent
  | ArmyMovedEvent
  | MoveBouncedEvent
  | FieldBattleEvent
  | ReinforcementsJoinedEvent
  | BattleFormedEvent
  | BombardmentEvent
  | BattleDecidedByBombardmentEvent
  | BattleResolvedEvent
  | RetreatedEvent
  | RetreatBlockedEvent
  | ZoneCapturedEvent
  | UnitsLostToModifierEvent
  | SupplyProducedEvent
  | PointsAwardedEvent
  | PlayerEliminatedEvent
  | ModifierExpiredEvent
  | EventAnnouncedEvent
  | StandingsRecordedEvent;
