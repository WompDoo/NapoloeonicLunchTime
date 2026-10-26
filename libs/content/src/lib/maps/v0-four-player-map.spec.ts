import type { ZoneId } from '@lunch-campaign/engine';
import { areZonesAdjacent, isCityZone } from '@lunch-campaign/engine';
import { V0_FOUR_PLAYER_MAP } from './v0-four-player-map';

const ZONE_IDS = V0_FOUR_PLAYER_MAP.zones.map((zone) => zone.id);

function neighboursOf(zoneId: ZoneId): readonly ZoneId[] {
  return ZONE_IDS.filter((candidate) =>
    areZonesAdjacent(V0_FOUR_PLAYER_MAP, zoneId, candidate),
  );
}

function movesToNearestCity(start: ZoneId): number {
  const isOtherCity = (zoneId: ZoneId): boolean =>
    zoneId !== start && isCityZone(V0_FOUR_PLAYER_MAP, zoneId);
  const search = (
    frontier: readonly ZoneId[],
    visited: ReadonlySet<ZoneId>,
    distance: number,
  ): number => {
    const next = [...new Set(frontier.flatMap(neighboursOf))].filter(
      (zoneId) => !visited.has(zoneId),
    );
    return next.some(isOtherCity)
      ? distance + 1
      : search(next, new Set([...visited, ...next]), distance + 1);
  };
  return search([start], new Set([start]), 0);
}

describe('v0 four-player map', () => {
  it('is a 4×4 grid of zones A1…D4', () => {
    expect(ZONE_IDS).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'B1',
      'B2',
      'B3',
      'B4',
      'C1',
      'C2',
      'C3',
      'C4',
      'D1',
      'D2',
      'D3',
      'D4',
    ]);
  });

  it('puts capitals in the corners and cities in the centre', () => {
    const kinds = Object.fromEntries(
      V0_FOUR_PLAYER_MAP.zones.map((zone) => [zone.id, zone.kind]),
    );
    expect(kinds).toEqual({
      A1: 'capital',
      A2: 'plain',
      A3: 'plain',
      A4: 'capital',
      B1: 'plain',
      B2: 'city',
      B3: 'city',
      B4: 'plain',
      C1: 'plain',
      C2: 'city',
      C3: 'city',
      C4: 'plain',
      D1: 'capital',
      D2: 'plain',
      D3: 'plain',
      D4: 'capital',
    });
  });

  it('seats players 1–4 at A1, A4, D1 and D4', () => {
    expect(V0_FOUR_PLAYER_MAP.startingCapitals).toEqual([
      { seat: 1, zoneId: 'A1' },
      { seat: 2, zoneId: 'A4' },
      { seat: 3, zoneId: 'D1' },
      { seat: 4, zoneId: 'D4' },
    ]);
  });

  it('connects zones orthogonally only', () => {
    expect(V0_FOUR_PLAYER_MAP.connections).toHaveLength(24);
    expect(ZONE_IDS.map((zoneId) => neighboursOf(zoneId).length)).toEqual([
      2, 3, 3, 2, 3, 4, 4, 3, 3, 4, 4, 3, 2, 3, 3, 2,
    ]);
  });

  it('places every capital two moves from its nearest city', () => {
    const capitals = V0_FOUR_PLAYER_MAP.startingCapitals.map(
      (capital) => capital.zoneId,
    );
    expect(capitals.map(movesToNearestCity)).toEqual([2, 2, 2, 2]);
  });
});
