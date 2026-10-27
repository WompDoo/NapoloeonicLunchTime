import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import { adjacentZoneIds } from './map-geometry';

describe('adjacentZoneIds', () => {
  it.each([
    { zoneId: 'A1', neighbours: ['A2', 'B1'] },
    { zoneId: 'B2', neighbours: ['A2', 'B1', 'B3', 'C2'] },
    { zoneId: 'Z9', neighbours: [] },
  ])('finds $neighbours next to $zoneId', ({ zoneId, neighbours }) => {
    expect(
      [...adjacentZoneIds(DEFAULT_MATCH_CONFIG.map.connections, zoneId)].sort(),
    ).toEqual(neighbours);
  });
});
