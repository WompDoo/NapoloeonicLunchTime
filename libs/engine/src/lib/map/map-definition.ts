import type { ZoneId } from '../core/ids';

export const ZONE_KINDS = ['plain', 'city', 'capital'] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

/** Capitals are cities: they score city points. */
export const ZONE_KIND_COUNTS_AS_CITY: Readonly<Record<ZoneKind, boolean>> = {
  plain: false,
  city: true,
  capital: true,
};

/** Where a zone is drawn, 1-based: renderers lay the map out on this grid. */
export interface ZonePosition {
  readonly row: number;
  readonly column: number;
}

export interface ZoneDefinition {
  readonly id: ZoneId;
  readonly kind: ZoneKind;
  readonly position: ZonePosition;
}

/** An undirected edge between two zones. */
export type ZoneConnection = readonly [ZoneId, ZoneId];

export interface StartingCapital {
  readonly seat: number;
  readonly zoneId: ZoneId;
}

/**
 * A validated, normalised map: zones sorted by id, connections stored as sorted pairs
 * in sorted order, starting capitals sorted by seat.
 */
export interface MapDefinition {
  readonly id: string;
  readonly zones: readonly ZoneDefinition[];
  readonly connections: readonly ZoneConnection[];
  readonly startingCapitals: readonly StartingCapital[];
}
