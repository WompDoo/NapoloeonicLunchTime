export type PlayerId = string & { readonly brand: 'PlayerId' };
export type ZoneId = string & { readonly brand: 'ZoneId' };

export function toPlayerId(value: string): PlayerId {
  return value as PlayerId;
}

export function toZoneId(value: string): ZoneId {
  return value as ZoneId;
}

/**
 * Locale-independent string ordering (UTF-16 code units).
 * `localeCompare` is banned in the engine because its result depends on the host's locale.
 */
export function compareByCodeUnitOrder(left: string, right: string): number {
  return Number(left > right) - Number(left < right);
}
