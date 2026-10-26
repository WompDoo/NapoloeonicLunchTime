import type { PlayerId } from '../core/ids';
import type {
  MultiplierMatrix,
  UnitCounts,
  UnitType,
  UnitTypeRecord,
} from '../core/unit-types';

export type BattleRole = 'defender' | 'attacker';

export type StrengthBonusSource = 'defender';

export interface StrengthBonus {
  readonly source: StrengthBonusSource;
  /** Fraction added to strength, e.g. 0.25 for +25%. Bonuses on one side add up. */
  readonly value: number;
}

/** The effective combat parameters of one side. */
export interface CombatProfile {
  readonly baseStrength: UnitTypeRecord<number>;
  /** `offense[ownType][targetType]` */
  readonly offense: MultiplierMatrix;
  /** `vulnerability[ownType][attackerType]` */
  readonly vulnerability: MultiplierMatrix;
  readonly winnerLossRatio: number;
}

export interface BattleSide {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  readonly units: UnitCounts;
  readonly profile: CombatProfile;
  readonly bonuses: readonly StrengthBonus[];
}

export interface StrengthContribution {
  readonly unitType: UnitType;
  readonly targetType: UnitType;
  readonly value: number;
}

/** Why a side's strength is what it is; the replay narrates battles from this. */
export interface StrengthBreakdown {
  /** One entry per own unit type present × enemy unit type present. */
  readonly contributions: readonly StrengthContribution[];
  /** Sum of contributions, before bonuses. */
  readonly baseStrength: number;
  readonly bonuses: readonly StrengthBonus[];
  /** `baseStrength × (1 + Σ bonuses)`: the S compared between sides. */
  readonly totalStrength: number;
}

export type BattleOutcome =
  | { readonly kind: 'victory'; readonly winnerId: PlayerId }
  | { readonly kind: 'mutualDestruction' };

export interface BattleSideResult {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  readonly unitsBefore: UnitCounts;
  readonly unitsLost: UnitCounts;
  readonly unitsRemaining: UnitCounts;
  readonly strength: StrengthBreakdown;
}

export interface BattleResult {
  /** Same order as the sides passed in. */
  readonly sides: readonly BattleSideResult[];
  readonly outcome: BattleOutcome;
}

export interface BattleRules {
  readonly casualtyRemovalOrder: readonly (readonly UnitType[])[];
}
