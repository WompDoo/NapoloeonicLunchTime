import type { ZoneView } from '@lunch-campaign/contracts';
import { requirePresent, toZoneId } from '@lunch-campaign/engine';
import { spiedWeekView } from '@lunch-campaign/player-view/testing';
import { NAPOLEON_PLAYER } from '../../../testing/match-fixtures';
import {
  MAP_DIRECTIONS,
  MAP_MARGIN,
  placeZones,
  roadsBetween,
  viewBoxOf,
  ZONE_SPACING,
  zoneInDirection,
} from './map-layout';

const view = spiedWeekView(0, NAPOLEON_PLAYER);

function zone(zoneId: string): ZoneView {
  return requirePresent(
    view.zones.find((candidate) => candidate.zoneId === zoneId),
    zoneId,
  );
}

function step(key: string): (typeof MAP_DIRECTIONS)[string] {
  return requirePresent(MAP_DIRECTIONS[key], key);
}

/** A map with a gap: no zone at row 1, column 2. */
const GAPPED: readonly ZoneView[] = [
  { ...zone('A1'), position: { row: 1, column: 1 } },
  { ...zone('A3'), zoneId: toZoneId('A3'), position: { row: 1, column: 3 } },
  { ...zone('B2'), position: { row: 2, column: 2 } },
];

describe('map layout', () => {
  it('places zones on the grid', () => {
    const placed = placeZones(view.zones);
    expect(placed[0]).toMatchObject({ x: MAP_MARGIN, y: MAP_MARGIN });
    expect(placed.find((place) => place.zone.zoneId === 'B3')).toMatchObject({
      x: MAP_MARGIN + 2 * ZONE_SPACING,
      y: MAP_MARGIN + ZONE_SPACING,
    });
  });

  it('fits the view box around every zone', () => {
    const size = 2 * MAP_MARGIN + 3 * ZONE_SPACING;
    expect(viewBoxOf(placeZones(view.zones))).toBe(`0 0 ${size} ${size}`);
  });

  it('draws a road for every connection', () => {
    const roads = roadsBetween(placeZones(view.zones), view.connections);
    expect(roads).toHaveLength(view.connections.length);
    expect(roads[0]).toMatchObject({
      key: 'A1-A2',
      from: { zone: { zoneId: 'A1' } },
      to: { zone: { zoneId: 'A2' } },
    });
  });

  it('refuses a road to a zone that is not on the map', () => {
    expect(() =>
      roadsBetween(placeZones(view.zones), [[toZoneId('A1'), toZoneId('Z9')]]),
    ).toThrow('Z9');
  });
});

describe('zoneInDirection', () => {
  it.each([
    { from: 'B2', key: 'ArrowUp', to: 'A2' },
    { from: 'B2', key: 'ArrowDown', to: 'C2' },
    { from: 'B2', key: 'ArrowLeft', to: 'B1' },
    { from: 'B2', key: 'ArrowRight', to: 'B3' },
    { from: 'A1', key: 'ArrowUp', to: null },
    { from: 'D4', key: 'ArrowRight', to: null },
  ])('moves $key from $from to $to', ({ from, key, to }) => {
    const next = zoneInDirection(view.zones, zone(from), step(key));
    expect(next === null ? null : next.zoneId).toBe(to);
  });

  it('crosses a gap, preferring the straight line', () => {
    const from = requirePresent(GAPPED[0], 'A1');
    expect(zoneInDirection(GAPPED, from, step('ArrowRight'))).toMatchObject({
      zoneId: 'A3',
    });
    expect(zoneInDirection(GAPPED, from, step('ArrowDown'))).toMatchObject({
      zoneId: 'B2',
    });
  });
});
