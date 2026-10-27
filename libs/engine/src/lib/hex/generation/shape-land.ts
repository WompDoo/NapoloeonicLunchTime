import type { Hex, HexId } from '../hex';
import { HEX_ORIGIN, hexDistance, hexesWithin, hexId, hexOfId } from '../hex';
import { isEdgeHex, neighbourIdsOnMap } from '../hex-map';
import { reachableFrom } from '../hex-search';
import type { MapDraft } from './map-draft';
import { seededChance } from './map-draft';

/**
 * The land: a disc around the capitals with room behind each, whose outer rings the sea carves into bays.
 * The ground within `hexesBehindCapital` of a capital and everything inside the ring of capitals is never
 * carved. Hexes cut off from the centre by the sea go too.
 */
export const shapeLand = (draft: MapDraft): MapDraft => {
  const ringRadius = Math.max(
    ...draft.capitals.map((capital): number =>
      hexDistance(HEX_ORIGIN, capital.hex),
    ),
  );
  const start = hexesWithin(
    HEX_ORIGIN,
    ringRadius + draft.rules.hexesBehindCapital + draft.rules.coastRings,
  );
  const isCarvable = (hex: Hex): boolean =>
    hexDistance(HEX_ORIGIN, hex) > ringRadius && !isCapitalGround(draft, hex);
  const eroded = Array.from({ length: draft.rules.coastErosionPasses }).reduce<
    readonly Hex[]
  >(
    (land, _unused, pass): readonly Hex[] =>
      erode(draft, land, isCarvable, pass),
    start,
  );
  const filled = trimSpurs(draft, fillInlets(draft, start, eroded), isCarvable);
  const filledIds = new Set(filled.map(hexId));
  const connected = reachableFrom(hexId(HEX_ORIGIN), (id): readonly HexId[] =>
    neighbourIdsOnMap(hexOfId(id), filledIds),
  );
  const land = filled.filter((hex): boolean => connected.has(hexId(hex)));
  return { ...draft, land, onMap: new Set(land.map(hexId)) };
};

function isCapitalGround(draft: MapDraft, hex: Hex): boolean {
  return draft.capitals.some(
    (capital): boolean =>
      hexDistance(capital.hex, hex) <= draft.rules.hexesBehindCapital,
  );
}

function erode(
  draft: MapDraft,
  land: readonly Hex[],
  isCarvable: (hex: Hex) => boolean,
  pass: number,
): readonly Hex[] {
  const onLand = new Set(land.map(hexId));
  return land.filter(
    (hex): boolean => !isWashedAway(draft, hex, onLand, isCarvable, pass),
  );
}

function isWashedAway(
  draft: MapDraft,
  hex: Hex,
  onLand: ReadonlySet<HexId>,
  isCarvable: (hex: Hex) => boolean,
  pass: number,
): boolean {
  return (
    isCoastal(hex, onLand, isCarvable) &&
    seededChance(
      draft,
      draft.rules.coastErosionChance,
      'coast',
      pass,
      hexId(hex),
    )
  );
}

function isCoastal(
  hex: Hex,
  onLand: ReadonlySet<HexId>,
  isCarvable: (hex: Hex) => boolean,
): boolean {
  return isCarvable(hex) && isEdgeHex(hex, onLand);
}

/** Takes coastal hexes that stick out into the sea with too few land neighbours. */
function trimSpurs(
  draft: MapDraft,
  land: readonly Hex[],
  isCarvable: (hex: Hex) => boolean,
): readonly Hex[] {
  const onLand = new Set(land.map(hexId));
  return land.filter(
    (hex): boolean =>
      !isCarvable(hex) ||
      neighbourIdsOnMap(hex, onLand).length >= draft.rules.coastSpurNeighbours,
  );
}

/** Puts back carved hexes that land nearly surrounds. */
function fillInlets(
  draft: MapDraft,
  start: readonly Hex[],
  eroded: readonly Hex[],
): readonly Hex[] {
  const onLand = new Set(eroded.map(hexId));
  return start.filter(
    (hex): boolean =>
      onLand.has(hexId(hex)) ||
      neighbourIdsOnMap(hex, onLand).length >= draft.rules.coastFillNeighbours,
  );
}
