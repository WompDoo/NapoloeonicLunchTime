import { EngineContractError } from './engine-error';

export type UnknownRecord = Readonly<Record<string, unknown>>;

export function decodeRecord(value: unknown, path: string): UnknownRecord {
  if (!isNonNullObject(value)) {
    throw new EngineContractError(`${path} must be an object`);
  }
  return value;
}

export function decodeArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new EngineContractError(`${path} must be an array`);
  }
  return value;
}

export function decodeNonEmptyString(value: unknown, path: string): string {
  if (!isNonEmptyString(value)) {
    throw new EngineContractError(`${path} must be a non-empty string`);
  }
  return value;
}

export function decodePositiveInteger(value: unknown, path: string): number {
  if (!isPositiveInteger(value)) {
    throw new EngineContractError(`${path} must be a positive integer`);
  }
  return value;
}

export function decodeOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  path: string,
): T {
  if (!isOneOf(value, allowedValues)) {
    throw new EngineContractError(
      `${path} must be one of: ${allowedValues.join(', ')}`,
    );
  }
  return value;
}

function isNonNullObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): value is T {
  return allowedValues.some((allowedValue): boolean => allowedValue === value);
}

/** Returns the values that appear more than once, each reported once, in first-seen order. */
export function findDuplicates(values: readonly string[]): readonly string[] {
  const duplicates = values.filter(
    (value, index): boolean => values.indexOf(value) !== index,
  );
  return [...new Set(duplicates)];
}
