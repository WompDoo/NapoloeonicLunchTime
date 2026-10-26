export const COMBAT_UNIT_TYPES = ['line', 'cavalry', 'skirmishers'] as const;
export const SUPPORT_UNIT_TYPES = ['artillery'] as const;
export const UNIT_TYPES = [
  ...COMBAT_UNIT_TYPES,
  ...SUPPORT_UNIT_TYPES,
] as const;

export type CombatUnitType = (typeof COMBAT_UNIT_TYPES)[number];
export type SupportUnitType = (typeof SUPPORT_UNIT_TYPES)[number];
export type UnitType = (typeof UNIT_TYPES)[number];

export type UnitTypeRecord<T> = Readonly<Record<UnitType, T>>;
export type UnitCounts = UnitTypeRecord<number>;
/** Indexed `[row unit type][column unit type]`, e.g. `offense[attacker][target]`. */
export type MultiplierMatrix = UnitTypeRecord<UnitTypeRecord<number>>;
