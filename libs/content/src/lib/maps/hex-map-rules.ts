import type {
  Hex,
  MapGenerationRules,
  TerrainRules,
} from '@lunch-campaign/engine';

/*
 * The v2 map: tuning for the seeded hex map generator. These are starting guesses, tuned by looking at maps in
 * the map lab.
 */

function hex(q: number, r: number): Hex {
  return { q, r };
}

/**
 * Capital positions for each player count, in seat order around the ring. Neighbouring capitals are exactly
 * 6 moves apart: the closest to a regular ring the hexes allow, found by searching every ring of hexes near the
 * regular polygon. Straight-line distances differ by a fraction of a hex.
 */
export const CAPITAL_RINGS: Readonly<Record<number, readonly Hex[]>> = {
  2: [hex(3, 0), hex(-3, 0)],
  3: [hex(3, 0), hex(-3, 3), hex(0, -3)],
  4: [hex(3, 1), hex(-3, 4), hex(-3, -2), hex(3, -5)],
  5: [hex(5, 0), hex(-1, 5), hex(-5, 3), hex(-2, -3), hex(4, -5)],
  6: [hex(6, 0), hex(0, 6), hex(-6, 6), hex(-6, 0), hex(0, -6), hex(6, -6)],
  7: [
    hex(6, 0),
    hex(1, 6),
    hex(-5, 7),
    hex(-7, 3),
    hex(-4, -3),
    hex(2, -7),
    hex(7, -6),
  ],
  8: [
    hex(7, 0),
    hex(2, 6),
    hex(-4, 8),
    hex(-8, 6),
    hex(-7, 0),
    hex(-2, -6),
    hex(4, -8),
    hex(8, -6),
  ],
};

/** March points to enter a hex, from the spec's terrain table; lakes and mountains are impassable. */
export const DEFAULT_TERRAIN_RULES: TerrainRules = {
  movementCost: {
    plain: 2,
    road: 1,
    forest: 3,
    hills: 3,
    marsh: 4,
    lake: null,
    mountain: null,
  },
  riverCrossingCost: 2,
  bridgeCrossingCost: 0,
};

export const DEFAULT_MAP_GENERATION_RULES: MapGenerationRules = {
  capitalRings: CAPITAL_RINGS,
  hexesBehindCapital: 2,
  coastRings: 2,
  coastErosionPasses: 3,
  coastErosionChance: 0.35,
  coastFillNeighbours: 4,
  coastSpurNeighbours: 3,
  towns: {
    perPlayer: 1.5,
    spacing: 3,
    homeTownDistance: 3,
    contestedMargin: 1,
    homeTownKind: 'market',
    kindWeights: { market: 2, studFarm: 1, ironworks: 1 },
  },
  mountainRanges: { perPlayer: 0.75, size: 4 },
  lakes: { perPlayer: 0.5, size: 3 },
  hills: { perPlayer: 1, size: 4 },
  forests: { perPlayer: 1.5, size: 5 },
  marshes: { perPlayer: 0.5, size: 3 },
  rivers: { perPlayer: 0.5, maxLength: 40, meanderChance: 0.15 },
};
