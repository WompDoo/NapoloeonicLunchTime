import { compareByCodeUnitOrder } from '../../core/ids';
import { hexId } from '../hex';
import type {
  HexMap,
  MapCapital,
  MapEdge,
  MapHex,
  MapTown,
  TerrainRules,
} from '../hex-map';
import { hexPairId } from '../hex-map';
import { drawRivers } from './draw-rivers';
import { layRoads } from './lay-roads';
import type { MapDraft, MapStep } from './map-draft';
import { emptyDraft, terrainAt } from './map-draft';
import type { MapGenerationRules } from './map-generation-rules';
import { placeCapitals } from './place-capitals';
import { placeTerrain } from './place-terrain';
import { placeTowns } from './place-towns';
import { shapeLand } from './shape-land';

/** The order the map is built in: each step sees everything the steps before it placed. */
const MAP_STEPS: readonly MapStep[] = [
  placeCapitals,
  shapeLand,
  placeTowns,
  placeTerrain,
  drawRivers,
  layRoads,
];

/**
 * The map for a match: pure and deterministic, so the same seed and player count always give the same map.
 * Every random choice is a labelled draw from the seed.
 */
export function generateHexMap(
  seed: string,
  playerCount: number,
  rules: MapGenerationRules,
  terrainRules: TerrainRules,
): HexMap {
  return mapOf(
    MAP_STEPS.reduce<MapDraft>(
      (draft, step): MapDraft => step(draft),
      emptyDraft(seed, playerCount, rules, terrainRules),
    ),
  );
}

function mapOf(draft: MapDraft): HexMap {
  const bridged = new Set(draft.bridges.map(hexPairId));
  return {
    hexes: draft.land.map(
      (hex): MapHex => ({
        id: hexId(hex),
        hex,
        terrain: terrainAt(draft, hexId(hex)),
      }),
    ),
    edges: draft.rivers
      .map(
        (between): MapEdge => ({
          between,
          feature: bridged.has(hexPairId(between)) ? 'bridge' : 'river',
        }),
      )
      .toSorted((left, right): number =>
        compareByCodeUnitOrder(
          hexPairId(left.between),
          hexPairId(right.between),
        ),
      ),
    roads: draft.roads,
    towns: draft.towns
      .map((town): MapTown => ({ hexId: town.id, kind: town.kind }))
      .toSorted((left, right): number =>
        compareByCodeUnitOrder(left.hexId, right.hexId),
      ),
    capitals: draft.capitals.map(
      (capital): MapCapital => ({ seat: capital.seat, hexId: capital.id }),
    ),
  };
}
