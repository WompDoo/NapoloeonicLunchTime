import type { PlayerId, UnitCounts, ZoneId } from '@lunch-campaign/engine';

/** What a spy saw: the zone's exact composition, except types its owner hides (Moore's skirmishers). */
export interface SpyReport {
  /** The player who sent the spy. */
  readonly playerId: PlayerId;
  /** The day the report was made; it stays true all day, since the world only changes at night. */
  readonly turnNumber: number;
  readonly zoneId: ZoneId;
  readonly ownerId: PlayerId | null;
  /** Identified units. Hidden types count as 0 here and towards `unidentified` instead. */
  readonly units: UnitCounts;
  readonly unidentified: number;
}
