import { totalUnitCount, unitTypesPresent } from '../core/unit-counts';
import type { UnitType } from '../core/unit-types';
import { UNIT_TYPES } from '../core/unit-types';
import type {
  BattleSide,
  StrengthBonus,
  StrengthBreakdown,
  StrengthContribution,
} from './battle';

const UNMODIFIED_STRENGTH_FACTOR = 1;

/**
 * S_A = (Σ_u n_A(u)·b(u)·Σ_t (n_E(t)/N_E)·off_A[u][t]·vul_E[t][u]) · (1 + β_A)
 *
 * E is the union of all of A's enemies in the battle. Each enemy side contributes its own share of
 * N_E with its own vulnerability matrix, so upgrades only ever patch their owner's matrices.
 */
export function computeStrength(
  side: BattleSide,
  enemies: readonly BattleSide[],
): StrengthBreakdown {
  const enemyTargetTypes = unitTypesPresentInAny(enemies);
  const contributions = unitTypesPresent(side.units).flatMap(
    (unitType): readonly StrengthContribution[] =>
      enemyTargetTypes.map(
        (targetType): StrengthContribution => ({
          unitType,
          targetType,
          value: computeContribution(side, unitType, targetType, enemies),
        }),
      ),
  );
  const baseStrength = sumValues(
    contributions.map((contribution): number => contribution.value),
  );
  return {
    contributions,
    baseStrength,
    bonuses: side.bonuses,
    totalStrength:
      baseStrength * (UNMODIFIED_STRENGTH_FACTOR + sumBonuses(side.bonuses)),
  };
}

function computeContribution(
  side: BattleSide,
  unitType: UnitType,
  targetType: UnitType,
  enemies: readonly BattleSide[],
): number {
  const enemyUnitTotal = sumValues(
    enemies.map((enemy): number => totalUnitCount(enemy.units)),
  );
  const effectiveness = sumValues(
    enemies.map(
      (enemy): number =>
        (enemy.units[targetType] / enemyUnitTotal) *
        side.profile.offense[unitType][targetType] *
        enemy.profile.vulnerability[targetType][unitType],
    ),
  );
  return (
    side.units[unitType] * side.profile.baseStrength[unitType] * effectiveness
  );
}

function unitTypesPresentInAny(
  sides: readonly BattleSide[],
): readonly UnitType[] {
  return UNIT_TYPES.filter((unitType): boolean =>
    sides.some((side): boolean => side.units[unitType] > 0),
  );
}

function sumBonuses(bonuses: readonly StrengthBonus[]): number {
  return sumValues(bonuses.map((bonus): number => bonus.value));
}

function sumValues(values: readonly number[]): number {
  return values.reduce((total, value): number => total + value, 0);
}
