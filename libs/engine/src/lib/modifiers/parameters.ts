import type {
  MultiplierMatrix,
  UnitType,
  UnitTypeRecord,
} from '../core/unit-types';
import type { BattleRole } from '../combat/battle';
import type { MatchConfig } from '../config/match-config';

/** A strength bonus that applies whenever its owner fights in the given role. */
export interface ConditionalStrengthBonus {
  readonly source: string;
  readonly role: BattleRole;
  readonly value: number;
}

/**
 * Everything the engine reads that a modifier may change, for one player (and optionally one zone) on one
 * night. The engine never asks "is this Napoleon?"; it asks for these parameters.
 */
export interface EffectiveParameters {
  readonly baseStrength: UnitTypeRecord<number>;
  /** `offense[ownType][targetType]` */
  readonly offense: MultiplierMatrix;
  /** `vulnerability[ownType][attackerType]` */
  readonly vulnerability: MultiplierMatrix;
  /** The base bonus while defending. Other defending bonuses live in `strengthBonuses`. */
  readonly defenderBonus: number;
  readonly winnerLossRatio: number;
  readonly strengthBonuses: readonly ConditionalStrengthBonus[];
  /** Attacking with any of these types cancels every defending bonus of the defender. */
  readonly defenderBonusSuppressorTypes: readonly UnitType[];
  readonly orderlyRetreat: boolean;
  readonly bombardmentHitsPerArtillery: number;
  readonly bombardmentVolleys: number;
  readonly shieldedFromEnemyBombardment: boolean;
  /** How many zones each unit type may move in one order; 0 means it cannot move. */
  readonly moveRange: UnitTypeRecord<number>;
  /** Moves into zones owned or occupied by others, or contested by several players, bounce back. */
  readonly foreignAndContestedMovesBounce: boolean;
  readonly recruitCost: UnitTypeRecord<number>;
  readonly upgradeCost: number;
  readonly productionFactor: number;
  /** Read by player views and spies (Milestone 4). */
  readonly spiesAvailable: boolean;
  readonly unitCountsVisible: boolean;
  readonly spyHiddenUnitTypes: readonly UnitType[];
}

const NO_PRODUCTION_CHANGE = 1;

export function baseParameters(config: MatchConfig): EffectiveParameters {
  return {
    baseStrength: config.combat.baseStrength,
    offense: config.combat.offense,
    vulnerability: config.combat.vulnerability,
    defenderBonus: config.combat.defenderBonus,
    winnerLossRatio: config.combat.winnerLossRatio,
    strengthBonuses: [],
    defenderBonusSuppressorTypes: [],
    orderlyRetreat: false,
    bombardmentHitsPerArtillery: config.bombardment.hitsPerArtillery,
    bombardmentVolleys: config.bombardment.volleysPerNight,
    shieldedFromEnemyBombardment: false,
    moveRange: config.movement.moveRange,
    foreignAndContestedMovesBounce: false,
    recruitCost: config.economy.recruitCost,
    upgradeCost: config.economy.upgradeCost,
    productionFactor: NO_PRODUCTION_CHANGE,
    spiesAvailable: config.intelligence.spiesAvailable,
    unitCountsVisible: config.intelligence.unitCountsVisible,
    spyHiddenUnitTypes: [],
  };
}
