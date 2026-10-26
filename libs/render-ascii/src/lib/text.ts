import type { UnitCounts, UnitType } from '@lunch-campaign/player-view';
import { UNIT_TYPES } from '@lunch-campaign/player-view';

/** One letter per unit type, used in every army text: "3L 2C". */
export const UNIT_LETTERS: Readonly<Record<UnitType, string>> = {
  line: 'L',
  cavalry: 'C',
  skirmishers: 'S',
  artillery: 'A',
};
const NO_UNITS = 'none';
const DISPLAYED_DECIMALS = 2;
const PERCENT = 100;
const COLUMN_GAP = '  ';
const LAST_ITEM = -1;

/** "L line, C cavalry, …" for legends. */
export const UNIT_LEGEND = UNIT_TYPES.map(
  (unitType): string => `${UNIT_LETTERS[unitType]} ${unitType}`,
).join(', ');

/** Each unit type present as "3L", in unit type order. */
export function unitParts(units: UnitCounts): readonly string[] {
  return UNIT_TYPES.filter((unitType): boolean => units[unitType] > 0).map(
    (unitType): string => `${units[unitType]}${UNIT_LETTERS[unitType]}`,
  );
}

/** "3L 2C"; "none" for no units. */
export function describeUnits(units: UnitCounts): string {
  const parts = unitParts(units);
  return parts.length === 0 ? NO_UNITS : parts.join(' ');
}

/** "1 unit", "5 units". */
export function describeCount(count: number): string {
  return plural(count, 'unit', 'units');
}

/** "1 city", "2 cities". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "a", "a and b", "a, b and c". */
export function listText(items: readonly string[]): string {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, LAST_ITEM).join(', ')} and ${items.slice(LAST_ITEM).join('')}`;
}

/** At most two decimals, without trailing zeros: 5.500000000000001 → "5.5". */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(DISPLAYED_DECIMALS)));
}

/** 0.25 → "25%". */
export function formatPercent(fraction: number): string {
  return `${formatNumber(fraction * PERCENT)}%`;
}

/** "insufficientUnits" → "insufficient units". */
export function humanise(identifier: string): string {
  return identifier.replace(/([A-Z])/g, ' $1').toLowerCase();
}

/** Pads every column to its widest cell. */
export function formatTable(
  rows: readonly (readonly string[])[],
): readonly string[] {
  return rows.map((row): string =>
    row
      .map((cell, column): string => cell.padEnd(columnWidth(rows, column)))
      .join(COLUMN_GAP)
      .trimEnd(),
  );
}

function columnWidth(
  rows: readonly (readonly string[])[],
  column: number,
): number {
  return Math.max(
    ...rows.flatMap((row): readonly number[] =>
      row.slice(column, column + 1).map((cell): number => cell.length),
    ),
  );
}

/** A titled block of lines. */
export function section(
  title: string,
  lines: readonly string[],
): readonly string[] {
  return [title.toUpperCase(), ...lines];
}

/** Contract checks for view data, e.g. a zone owner missing from the players. */
export function requireFound<T>(value: T | undefined, description: string): T {
  if (value === undefined) {
    throw new Error(`Malformed player view: missing ${description}`);
  }
  return value;
}
