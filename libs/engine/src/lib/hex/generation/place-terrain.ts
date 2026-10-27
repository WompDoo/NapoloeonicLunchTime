import { requirePresent } from '../../core/engine-error';
import type { Hex, HexId } from '../hex';
import { hexDistance, hexId, hexNeighbours, hexOfId } from '../hex';
import type { HexTerrain } from '../hex-map';
import { isEdgeHex, isPassableTerrain, neighbourIdsOnMap } from '../hex-map';
import { reachableFrom } from '../hex-search';
import type { MapDraft, MapStep } from './map-draft';
import {
  countFor,
  isCapitalOrTown,
  pickSeededIfAny,
  terrainAt,
} from './map-draft';
import type { TerrainPatchRules } from './map-generation-rules';

/** How a patch grows: a range from its newest hex, a blob from any of its hexes. */
type PatchShape = 'range' | 'blob';

interface PatchKind {
  readonly terrain: HexTerrain;
  readonly rules: TerrainPatchRules;
  readonly shape: PatchShape;
}

const FRONTIERS: Readonly<
  Record<PatchShape, (patch: readonly Hex[]) => readonly Hex[]>
> = {
  range: (patch): readonly Hex[] =>
    hexNeighbours(requirePresent(patch.at(-1), 'the newest hex of a range')),
  blob: (patch): readonly Hex[] => patch.flatMap(hexNeighbours),
};

/**
 * Terrain patches on open plain: mountain ranges and lakes first, then hills, forests and marsh. Mountains and
 * lakes never touch the map's edge or a capital's neighbours, and are only placed where every passable hex
 * stays reachable from every other.
 */
export const placeTerrain: MapStep = (draft) =>
  patchKinds(draft).reduce<MapDraft>(
    (current, kind): MapDraft => placePatches(current, kind),
    draft,
  );

function patchKinds(draft: MapDraft): readonly PatchKind[] {
  return [
    { terrain: 'mountain', rules: draft.rules.mountainRanges, shape: 'range' },
    { terrain: 'lake', rules: draft.rules.lakes, shape: 'blob' },
    { terrain: 'hills', rules: draft.rules.hills, shape: 'blob' },
    { terrain: 'forest', rules: draft.rules.forests, shape: 'blob' },
    { terrain: 'marsh', rules: draft.rules.marshes, shape: 'blob' },
  ];
}

function placePatches(draft: MapDraft, kind: PatchKind): MapDraft {
  return Array.from({
    length: countFor(draft, kind.rules.perPlayer),
  }).reduce<MapDraft>(
    (current, _unused, index): MapDraft => placePatch(current, kind, index),
    draft,
  );
}

function placePatch(draft: MapDraft, kind: PatchKind, index: number): MapDraft {
  const starts = draft.land.filter((hex): boolean => isSite(draft, kind, hex));
  return pickSeededIfAny(draft, starts, kind.terrain, index, 'start')
    .flatMap((start): readonly Hex[] => takenIfAllowed(draft, kind, start))
    .reduce<MapDraft>(
      (current, start): MapDraft =>
        growPatch(withTerrain(current, start, kind.terrain), kind, index, [
          start,
        ]),
      draft,
    );
}

function growPatch(
  draft: MapDraft,
  kind: PatchKind,
  index: number,
  patch: readonly Hex[],
): MapDraft {
  if (patch.length >= kind.rules.size) {
    return draft;
  }
  const candidates = uniqueHexes(FRONTIERS[kind.shape](patch)).filter(
    (hex): boolean => draft.onMap.has(hexId(hex)) && isSite(draft, kind, hex),
  );
  return pickSeededIfAny(draft, candidates, kind.terrain, index, patch.length)
    .flatMap((next): readonly Hex[] => takenIfAllowed(draft, kind, next))
    .reduce<MapDraft>(
      (current, next): MapDraft =>
        growPatch(withTerrain(current, next, kind.terrain), kind, index, [
          ...patch,
          next,
        ]),
      draft,
    );
}

/** A cheap check for every candidate; the costly reachability check only for the one drawn. */
function isSite(draft: MapDraft, kind: PatchKind, hex: Hex): boolean {
  return isOpenPlain(draft, hex) && isAllowedFor(draft, kind, hex);
}

function isOpenPlain(draft: MapDraft, hex: Hex): boolean {
  return (
    terrainAt(draft, hexId(hex)) === 'plain' &&
    !isCapitalOrTown(draft, hexId(hex))
  );
}

function isAllowedFor(draft: MapDraft, kind: PatchKind, hex: Hex): boolean {
  return (
    isPassableTerrain(kind.terrain, draft.terrainRules) || isInland(draft, hex)
  );
}

/** Off the map's edge and not next to a capital. */
function isInland(draft: MapDraft, hex: Hex): boolean {
  return !isEdgeHex(hex, draft.onMap) && isAwayFromCapitals(draft, hex);
}

function isAwayFromCapitals(draft: MapDraft, hex: Hex): boolean {
  return draft.capitals.every(
    (capital): boolean => hexDistance(capital.hex, hex) > 1,
  );
}

function takenIfAllowed(
  draft: MapDraft,
  kind: PatchKind,
  hex: Hex,
): readonly Hex[] {
  return isAllowedToTake(draft, kind, hex) ? [hex] : [];
}

function isAllowedToTake(draft: MapDraft, kind: PatchKind, hex: Hex): boolean {
  return (
    isPassableTerrain(kind.terrain, draft.terrainRules) ||
    keepsLandConnected(draft, hex)
  );
}

/** Whether every passable hex can still reach every other once this hex is blocked. */
function keepsLandConnected(draft: MapDraft, blocked: Hex): boolean {
  const blockedId = hexId(blocked);
  const isOpen = (id: HexId): boolean =>
    id !== blockedId &&
    isPassableTerrain(terrainAt(draft, id), draft.terrainRules);
  const open = draft.land.map(hexId).filter(isOpen);
  const reached = reachableFrom(
    requirePresent(draft.capitals[0], 'a capital').id,
    (id): readonly HexId[] =>
      neighbourIdsOnMap(hexOfId(id), draft.onMap).filter(isOpen),
  );
  return reached.size === open.length;
}

function withTerrain(draft: MapDraft, hex: Hex, terrain: HexTerrain): MapDraft {
  return {
    ...draft,
    terrain: new Map([...draft.terrain, [hexId(hex), terrain]]),
  };
}

function uniqueHexes(hexes: readonly Hex[]): readonly Hex[] {
  return [
    ...new Map(hexes.map((hex): [HexId, Hex] => [hexId(hex), hex])).values(),
  ];
}
