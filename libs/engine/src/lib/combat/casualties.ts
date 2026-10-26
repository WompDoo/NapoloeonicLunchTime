import { requirePresent } from '../core/engine-error';
import type { UnitCounts, UnitType } from '../core/unit-types';

/** Removes casualties one unit at a time, always from the currently most numerous type of the earliest non-empty group. */
export function removeCasualties(
  units: UnitCounts,
  casualties: number,
  removalOrder: readonly (readonly UnitType[])[],
): UnitCounts {
  return Array.from({ length: casualties }).reduce<UnitCounts>(
    (remainingUnits): UnitCounts =>
      removeOneCasualty(remainingUnits, removalOrder),
    units,
  );
}

function removeOneCasualty(
  units: UnitCounts,
  removalOrder: readonly (readonly UnitType[])[],
): UnitCounts {
  const casualtyType = selectCasualtyType(units, removalOrder);
  return { ...units, [casualtyType]: units[casualtyType] - 1 };
}

function selectCasualtyType(
  units: UnitCounts,
  removalOrder: readonly (readonly UnitType[])[],
): UnitType {
  const group = requirePresent(
    removalOrder.find((candidateGroup): boolean =>
      candidateGroup.some((unitType): boolean => units[unitType] > 0),
    ),
    'unit to remove as a casualty',
  );
  return group.reduce(
    (mostNumerousType, unitType): UnitType =>
      units[unitType] > units[mostNumerousType] ? unitType : mostNumerousType,
  );
}
