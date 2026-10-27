import type { PlayerView, ZoneView } from '@lunch-campaign/contracts';
import type { UnitCounts, UnitType } from '@lunch-campaign/engine';
import { NO_UNITS } from '@lunch-campaign/engine';

/** The viewer's zones, in zone id order. */
export function ownZones(view: PlayerView): readonly ZoneView[] {
  return view.zones.filter((zone): boolean => zone.ownerId === view.viewerId);
}

/** The viewer's units in a zone: its composition when the zone is theirs, none otherwise. */
export function ownUnitsIn(zone: ZoneView): UnitCounts {
  return zone.army.kind === 'composition' ? zone.army.units : NO_UNITS;
}

/** The viewer's zones holding at least one unit of the given types. */
export function ownZonesWith(
  view: PlayerView,
  unitTypes: readonly UnitType[],
): readonly ZoneView[] {
  return ownZones(view).filter((zone): boolean =>
    unitTypes.some((unitType): boolean => ownUnitsIn(zone)[unitType] > 0),
  );
}

/** A whole number of units between none and what is there: what a number field may hold. */
export function clampCount(value: number, available: number): number {
  return Number.isNaN(value)
    ? 0
    : Math.min(Math.max(Math.trunc(value), 0), available);
}

/** The viewer's units in the zone with this id; none when there is no such zone or it is not theirs. */
export function ownUnitsAt(
  view: PlayerView,
  zoneId: string | null,
): UnitCounts {
  const zone = view.zones.find(
    (candidate): boolean => candidate.zoneId === zoneId,
  );
  return zone === undefined ? NO_UNITS : ownUnitsIn(zone);
}
