import type {
  MultiplierMatrix,
  UnitCounts,
  UnitType,
  UnitTypeRecord,
} from '../core/unit-types';
import type { MapDefinition, ZoneKind } from '../map/map-definition';
import type {
  CommanderDefinition,
  EventDefinition,
  UpgradeDefinition,
} from '../modifiers/modifier-definitions';

export interface EconomyRules {
  readonly startingSupply: number;
  readonly productionByZoneKind: Readonly<Record<ZoneKind, number>>;
  readonly recruitCost: UnitTypeRecord<number>;
  readonly upgradeCost: number;
}

export interface CombatRules {
  readonly baseStrength: UnitTypeRecord<number>;
  /** `offense[attackerType][targetType]` */
  readonly offense: MultiplierMatrix;
  /** `vulnerability[targetType][attackerType]` */
  readonly vulnerability: MultiplierMatrix;
  /** Fraction added to the defending side's strength, e.g. 0.25 for +25%. */
  readonly defenderBonus: number;
  /** Winner's losses are `ceil(winnerLossRatio × second-highest strength)`. */
  readonly winnerLossRatio: number;
  /**
   * Casualties are removed one unit at a time. Groups are emptied in the order listed; within a group the
   * currently most numerous type loses a unit first, ties broken by the order the types are listed.
   */
  readonly casualtyRemovalOrder: readonly (readonly UnitType[])[];
}

export interface BombardmentRules {
  /** Units each supporting artillery removes per volley. */
  readonly hitsPerArtillery: number;
  readonly volleysPerNight: number;
}

export interface MovementRules {
  /** Zones each unit type may move in one order. */
  readonly moveRange: UnitTypeRecord<number>;
}

export interface IntelligenceRules {
  readonly spiesAvailable: boolean;
  readonly unitCountsVisible: boolean;
}

export interface OrderRules {
  readonly maxMoveOrdersPerTurn: number;
}

export interface CityPointsScoringRule {
  readonly kind: 'cityPoints';
  readonly pointsPerCity: number;
}

export type ScoringRule = CityPointsScoringRule;

export interface TurnScheduleEntry {
  /** Display name for the night this turn resolves, e.g. "Wednesday". */
  readonly label: string;
  readonly scoring: readonly ScoringRule[];
  /** The match event is active for this turn's orders and resolution, announced the night before. */
  readonly eventActive: boolean;
}

/** Every tuning value and content pool of a match. Modes are presets of this config, never code branches. */
export interface MatchConfig {
  readonly map: MapDefinition;
  readonly startingUnits: UnitCounts;
  readonly economy: EconomyRules;
  readonly combat: CombatRules;
  readonly bombardment: BombardmentRules;
  readonly movement: MovementRules;
  readonly intelligence: IntelligenceRules;
  readonly orders: OrderRules;
  /** One entry per resolution; turn 1 resolves `schedule[0]`. */
  readonly schedule: readonly TurnScheduleEntry[];
  readonly upgrades: readonly UpgradeDefinition[];
  readonly commanders: readonly CommanderDefinition[];
  /** The pool one match event is drawn from with the match seed. */
  readonly events: readonly EventDefinition[];
}
