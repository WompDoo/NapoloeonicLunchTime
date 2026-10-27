import type { Hex, HexId } from './hex';
import { compareHexIds, hexId, hexNeighbours } from './hex';

export const HEX_TERRAINS = [
  'plain',
  'road',
  'forest',
  'hills',
  'marsh',
  'lake',
  'mountain',
] as const;
export type HexTerrain = (typeof HEX_TERRAINS)[number];

export const EDGE_FEATURES = ['river', 'bridge'] as const;
/** A bridge is a river crossing that costs nothing. */
export type EdgeFeature = (typeof EDGE_FEATURES)[number];

export const TOWN_KINDS = ['market', 'studFarm', 'ironworks'] as const;
export type TownKind = (typeof TOWN_KINDS)[number];

export interface MapHex {
  readonly id: HexId;
  readonly hex: Hex;
  readonly terrain: HexTerrain;
}

/** The two hexes either side of an edge, in id order. */
export type HexPair = readonly [HexId, HexId];

export interface MapEdge {
  readonly between: HexPair;
  readonly feature: EdgeFeature;
}

export interface MapTown {
  readonly hexId: HexId;
  readonly kind: TownKind;
}

export interface MapCapital {
  readonly seat: number;
  readonly hexId: HexId;
}

/**
 * A generated hex map. Hexes are sorted by id; edges by their pair; capitals by seat; towns by hex id.
 * Roads are hexes with road terrain; `roads` lists the stretches between them, for drawing.
 */
export interface HexMap {
  readonly hexes: readonly MapHex[];
  readonly edges: readonly MapEdge[];
  readonly roads: readonly HexPair[];
  readonly towns: readonly MapTown[];
  readonly capitals: readonly MapCapital[];
}

/** March points to enter a hex of each terrain; null where no army can go. */
export type TerrainMovementCosts = Readonly<Record<HexTerrain, number | null>>;

export interface TerrainRules {
  readonly movementCost: TerrainMovementCosts;
  /** Added to the cost of entering a hex across a river edge. */
  readonly riverCrossingCost: number;
  /** Added instead when the river edge has a bridge. */
  readonly bridgeCrossingCost: number;
}

export function hexPair(left: HexId, right: HexId): HexPair {
  return compareHexIds(left, right) <= 0 ? [left, right] : [right, left];
}

export function hexPairId(pair: HexPair): string {
  return `${pair[0]}|${pair[1]}`;
}

export function isPassableTerrain(
  terrain: HexTerrain,
  rules: TerrainRules,
): boolean {
  return rules.movementCost[terrain] !== null;
}

/** The hexes next to this one that are on the map. */
export function neighbourIdsOnMap(
  hex: Hex,
  onMap: ReadonlySet<HexId>,
): readonly HexId[] {
  return hexNeighbours(hex)
    .map(hexId)
    .filter((neighbour): boolean => onMap.has(neighbour));
}

/** A hex on the map's edge has a neighbour off the map. */
export function isEdgeHex(hex: Hex, onMap: ReadonlySet<HexId>): boolean {
  return hexNeighbours(hex).some(
    (neighbour): boolean => !onMap.has(hexId(neighbour)),
  );
}
