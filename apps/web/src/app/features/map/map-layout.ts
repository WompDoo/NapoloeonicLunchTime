import type { ZoneView } from '@lunch-campaign/contracts';
import type { ZoneConnection, ZoneId } from '@lunch-campaign/engine';
import { compareInOrder, requirePresent } from '@lunch-campaign/engine';

/** Distance between neighbouring zone centres, in SVG user units. */
export const ZONE_SPACING = 110;
/** Space around the outermost zones. */
export const MAP_MARGIN = 56;
export const ZONE_RADIUS = 34;

export interface PlacedZone {
  readonly zone: ZoneView;
  readonly x: number;
  readonly y: number;
}

export interface Road {
  readonly key: string;
  readonly from: PlacedZone;
  readonly to: PlacedZone;
}

/** Zones sit on the map's grid: column across, row down, both 1-based. */
export function placeZones(zones: readonly ZoneView[]): readonly PlacedZone[] {
  return zones.map(
    (zone): PlacedZone => ({
      zone,
      x: MAP_MARGIN + (zone.position.column - 1) * ZONE_SPACING,
      y: MAP_MARGIN + (zone.position.row - 1) * ZONE_SPACING,
    }),
  );
}

export function roadsBetween(
  placed: readonly PlacedZone[],
  connections: readonly ZoneConnection[],
): readonly Road[] {
  const byId = new Map(
    placed.map((zone): [string, PlacedZone] => [
      zone.zone.zoneId as string,
      zone,
    ]),
  );
  const at = (zoneId: ZoneId): PlacedZone =>
    requirePresent(byId.get(zoneId), `zone ${zoneId} on the map`);
  return connections.map(
    ([from, to]): Road => ({
      key: `${from}-${to}`,
      from: at(from),
      to: at(to),
    }),
  );
}

/** The SVG viewBox that fits every zone with the margin around it. */
export function viewBoxOf(placed: readonly PlacedZone[]): string {
  const width = Math.max(...placed.map((zone): number => zone.x)) + MAP_MARGIN;
  const height = Math.max(...placed.map((zone): number => zone.y)) + MAP_MARGIN;
  return `0 0 ${width} ${height}`;
}

interface GridStep {
  readonly row: number;
  readonly column: number;
}

/** Arrow keys move across the grid. */
export const MAP_DIRECTIONS: Readonly<Record<string, GridStep>> = {
  ArrowUp: { row: -1, column: 0 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
};

/** How far a zone lies in the step's direction (positive: ahead), and how far off that line. */
function along(zone: ZoneView, from: ZoneView, step: GridStep): number {
  return (
    (zone.position.row - from.position.row) * step.row +
    (zone.position.column - from.position.column) * step.column
  );
}

function across(zone: ZoneView, from: ZoneView, step: GridStep): number {
  return Math.abs(
    (zone.position.row - from.position.row) * step.column +
      (zone.position.column - from.position.column) * step.row,
  );
}

/**
 * The zone an arrow key moves to: the nearest one ahead in that direction, straightest line first, so
 * every zone is reachable on a grid with gaps. Null at the edge.
 */
export function zoneInDirection(
  zones: readonly ZoneView[],
  from: ZoneView,
  step: GridStep,
): ZoneView | null {
  const ahead = zones.filter((zone): boolean => along(zone, from, step) > 0);
  const [nearest] = ahead.toSorted(
    compareInOrder<ZoneView>([
      (left, right): number =>
        across(left, from, step) - across(right, from, step),
      (left, right): number =>
        along(left, from, step) - along(right, from, step),
    ]),
  );
  return nearest ?? null;
}
