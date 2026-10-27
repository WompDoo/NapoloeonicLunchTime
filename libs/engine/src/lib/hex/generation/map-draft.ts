import { requirePresent } from '../../core/engine-error';
import { seededFraction, seededIndex } from '../../core/random';
import type { Hex, HexId } from '../hex';
import { hexId } from '../hex';
import type { HexPair, HexTerrain, TerrainRules, TownKind } from '../hex-map';
import type { MapGenerationRules } from './map-generation-rules';

export interface PlacedCapital {
  readonly seat: number;
  readonly hex: Hex;
  readonly id: HexId;
}

export interface PlacedTown {
  readonly hex: Hex;
  readonly id: HexId;
  readonly kind: TownKind;
}

/** A map being generated. Each step returns a new draft with its part filled in. */
export interface MapDraft {
  readonly seed: string;
  readonly playerCount: number;
  readonly rules: MapGenerationRules;
  readonly terrainRules: TerrainRules;
  readonly capitals: readonly PlacedCapital[];
  /** Land hexes, sorted by id. */
  readonly land: readonly Hex[];
  readonly onMap: ReadonlySet<HexId>;
  readonly towns: readonly PlacedTown[];
  /** Every hex not listed is plain. */
  readonly terrain: ReadonlyMap<HexId, HexTerrain>;
  readonly rivers: readonly HexPair[];
  readonly bridges: readonly HexPair[];
  readonly roads: readonly HexPair[];
}

export type MapStep = (draft: MapDraft) => MapDraft;

export function emptyDraft(
  seed: string,
  playerCount: number,
  rules: MapGenerationRules,
  terrainRules: TerrainRules,
): MapDraft {
  return {
    seed,
    playerCount,
    rules,
    terrainRules,
    capitals: [],
    land: [],
    onMap: new Set(),
    towns: [],
    terrain: new Map(),
    rivers: [],
    bridges: [],
    roads: [],
  };
}

/** Every random draw in the map comes from the match seed and a label naming what is being drawn. */
export function mapLabel(
  draft: MapDraft,
  ...parts: readonly unknown[]
): string {
  return [draft.seed, 'map', ...parts].join(':');
}

export function seededChance(
  draft: MapDraft,
  chance: number,
  ...parts: readonly unknown[]
): boolean {
  return seededFraction(mapLabel(draft, ...parts)) < chance;
}

/** One of the items, drawn by the label. The list must not be empty. */
export function pickSeeded<T>(
  draft: MapDraft,
  items: readonly T[],
  ...parts: readonly unknown[]
): T {
  return requirePresent(
    items[seededIndex(mapLabel(draft, ...parts), items.length)],
    `a choice for ${mapLabel(draft, ...parts)}`,
  );
}

/** One of the items, or none when there are none. */
export function pickSeededIfAny<T>(
  draft: MapDraft,
  items: readonly T[],
  ...parts: readonly unknown[]
): readonly T[] {
  return items.length === 0 ? [] : [pickSeeded(draft, items, ...parts)];
}

export function terrainAt(draft: MapDraft, id: HexId): HexTerrain {
  return draft.terrain.get(id) ?? 'plain';
}

/** How many patches of something the map gets for its players. */
export function countFor(draft: MapDraft, perPlayer: number): number {
  return Math.round(perPlayer * draft.playerCount);
}

export function isCapitalOrTown(draft: MapDraft, id: HexId): boolean {
  return [...draft.capitals, ...draft.towns].some(
    (place): boolean => place.id === id,
  );
}

export function idsOf(hexes: readonly Hex[]): readonly HexId[] {
  return hexes.map(hexId);
}
