import { EngineContractError } from './engine-error';
import type { UnitCounts, UnitType, UnitTypeRecord } from './unit-types';
import { UNIT_TYPES } from './unit-types';

export function mapUnitTypes<T>(
  valueForType: (unitType: UnitType) => T,
): UnitTypeRecord<T> {
  return Object.fromEntries(
    UNIT_TYPES.map((unitType): readonly [UnitType, T] => [
      unitType,
      valueForType(unitType),
    ]),
  ) as UnitTypeRecord<T>;
}

export const NO_UNITS: UnitCounts = mapUnitTypes((): number => 0);

export function createUnitCounts(
  partialCounts: Partial<UnitCounts>,
): UnitCounts {
  return mapUnitTypes((unitType): number => partialCounts[unitType] ?? 0);
}

export function addUnitCounts(left: UnitCounts, right: UnitCounts): UnitCounts {
  return mapUnitTypes((unitType): number => left[unitType] + right[unitType]);
}

export function subtractUnitCounts(
  minuend: UnitCounts,
  subtrahend: UnitCounts,
): UnitCounts {
  assertUnitCountsContain(minuend, subtrahend);
  return mapUnitTypes(
    (unitType): number => minuend[unitType] - subtrahend[unitType],
  );
}

export function totalUnitCount(counts: UnitCounts): number {
  return UNIT_TYPES.reduce(
    (total, unitType): number => total + counts[unitType],
    0,
  );
}

export function hasAnyUnits(counts: UnitCounts): boolean {
  return totalUnitCount(counts) > 0;
}

export function unitCountsContain(
  container: UnitCounts,
  contained: UnitCounts,
): boolean {
  return UNIT_TYPES.every(
    (unitType): boolean => contained[unitType] <= container[unitType],
  );
}

export function isValidUnitCount(count: number): boolean {
  return Number.isInteger(count) && count >= 0;
}

export function areValidUnitCounts(counts: UnitCounts): boolean {
  return UNIT_TYPES.every((unitType): boolean =>
    isValidUnitCount(counts[unitType]),
  );
}

export function unitTypesPresent(counts: UnitCounts): readonly UnitType[] {
  return UNIT_TYPES.filter((unitType): boolean => counts[unitType] > 0);
}

function assertUnitCountsContain(
  container: UnitCounts,
  contained: UnitCounts,
): void {
  if (!unitCountsContain(container, contained)) {
    throw new EngineContractError('Cannot remove more units than are present');
  }
}

export function unitCountsOfSingleType(
  singleType: UnitType,
  count: number,
): UnitCounts {
  return mapUnitTypes((unitType): number =>
    unitType === singleType ? count : 0,
  );
}
