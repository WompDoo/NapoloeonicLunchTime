import type { Hex } from '../hex';
import type { TownKind } from '../hex-map';

/** Patches of one terrain: how many per player, and how many hexes each. */
export interface TerrainPatchRules {
  readonly perPlayer: number;
  readonly size: number;
}

export interface TownRules {
  readonly perPlayer: number;
  /** The fewest moves between two towns, and between a town and a capital. */
  readonly spacing: number;
  /** Every player has one town this many moves from their capital, nearer them than anyone else. */
  readonly homeTownDistance: number;
  /** The other towns lie where a hex's two nearest capitals are at most this many moves apart in distance. */
  readonly contestedMargin: number;
  /** Every home town is this kind, so no player starts with a better town than another. */
  readonly homeTownKind: TownKind;
  /** Relative chances of each kind, for the contested towns. */
  readonly kindWeights: Readonly<Record<TownKind, number>>;
}

export interface RiverRules {
  readonly perPlayer: number;
  /** The most edges one river runs along before it must have reached the coast. */
  readonly maxLength: number;
  /** The chance, at each corner, that a river turns away from the most direct way to the coast. */
  readonly meanderChance: number;
}

export interface MapGenerationRules {
  /**
   * Capital positions for each player count, in seat order, as offsets from the map's centre. Neighbouring
   * capitals are the same number of moves apart.
   */
  readonly capitalRings: Readonly<Record<number, readonly Hex[]>>;
  /** Every hex this close to a capital is on the map, so a capital is at least this far from the edge. */
  readonly hexesBehindCapital: number;
  /** Extra rings of land beyond that, which the sea may carve into bays. */
  readonly coastRings: number;
  readonly coastErosionPasses: number;
  /** The chance that the sea takes a coastal hex on each pass. */
  readonly coastErosionChance: number;
  /** A hex the sea took comes back when at least this many of its neighbours are land: no one-hex inlets. */
  readonly coastFillNeighbours: number;
  /** A land hex with fewer land neighbours than this is a spur, and the sea takes it. */
  readonly coastSpurNeighbours: number;
  readonly towns: TownRules;
  readonly mountainRanges: TerrainPatchRules;
  readonly lakes: TerrainPatchRules;
  readonly hills: TerrainPatchRules;
  readonly forests: TerrainPatchRules;
  readonly marshes: TerrainPatchRules;
  readonly rivers: RiverRules;
}
