import type { Hex } from '../hex';
import { HEX_ORIGIN, hexDistance, hexId } from '../hex';
import type { TownKind } from '../hex-map';
import { TOWN_KINDS } from '../hex-map';
import { seededFraction } from '../../core/random';
import { requirePresent } from '../../core/engine-error';
import type { MapDraft, PlacedCapital, PlacedTown } from './map-draft';
import { countFor, mapLabel, pickSeeded } from './map-draft';

/**
 * Towns: first one per player, `homeTownDistance` from their capital and nearer them than anyone else, all of
 * the same kind; then the rest towards the centre, nearer it than any capital. Towns keep `spacing` from each
 * other and from every capital.
 */
export const placeTowns = (draft: MapDraft): MapDraft => {
  const homeKind = kindFor(draft, 'home');
  const withHomeTowns = draft.capitals.reduce<MapDraft>(
    (current, capital): MapDraft => placeHomeTown(current, capital, homeKind),
    draft,
  );
  const centralCount = Math.max(
    countFor(draft, draft.rules.towns.perPlayer) - draft.capitals.length,
    0,
  );
  return Array.from({ length: centralCount }).reduce<MapDraft>(
    (current, _unused, index): MapDraft => placeCentralTown(current, index),
    withHomeTowns,
  );
};

function placeHomeTown(
  draft: MapDraft,
  capital: PlacedCapital,
  kind: TownKind,
): MapDraft {
  const candidates = draft.land.filter(
    (hex): boolean =>
      isHomeTownSite(draft, capital, hex) && isSpacedOut(draft, hex),
  );
  const hex = pickSeeded(draft, candidates, 'town', 'home', capital.seat);
  return withTown(draft, hex, kind);
}

function isHomeTownSite(
  draft: MapDraft,
  capital: PlacedCapital,
  hex: Hex,
): boolean {
  return (
    hexDistance(capital.hex, hex) === draft.rules.towns.homeTownDistance &&
    isNearerThanOtherCapitals(draft, capital, hex)
  );
}

function isNearerThanOtherCapitals(
  draft: MapDraft,
  capital: PlacedCapital,
  hex: Hex,
): boolean {
  return draft.capitals
    .filter((other): boolean => other.seat !== capital.seat)
    .every(
      (other): boolean =>
        hexDistance(other.hex, hex) > hexDistance(capital.hex, hex),
    );
}

function placeCentralTown(draft: MapDraft, index: number): MapDraft {
  const candidates = draft.land.filter(
    (hex): boolean => isCentral(draft, hex) && isSpacedOut(draft, hex),
  );
  const hex = pickSeeded(draft, candidates, 'town', 'central', index);
  return withTown(draft, hex, kindFor(draft, 'central', index));
}

/** Nearer the centre of the map than any capital. */
function isCentral(draft: MapDraft, hex: Hex): boolean {
  return draft.capitals.every(
    (capital): boolean =>
      hexDistance(capital.hex, hex) > hexDistance(HEX_ORIGIN, hex),
  );
}

function isSpacedOut(draft: MapDraft, hex: Hex): boolean {
  return [...draft.capitals, ...draft.towns].every(
    (place): boolean =>
      hexDistance(place.hex, hex) >= draft.rules.towns.spacing,
  );
}

function withTown(draft: MapDraft, hex: Hex, kind: TownKind): MapDraft {
  const town: PlacedTown = { hex, id: hexId(hex), kind };
  return { ...draft, towns: [...draft.towns, town] };
}

/** A kind drawn by the weights: the first whose running total passes the drawn share of the whole. */
function kindFor(draft: MapDraft, ...parts: readonly unknown[]): TownKind {
  const weights = draft.rules.towns.kindWeights;
  const total = TOWN_KINDS.reduce(
    (sum, kind): number => sum + weights[kind],
    0,
  );
  const target =
    seededFraction(mapLabel(draft, 'town', 'kind', ...parts)) * total;
  return requirePresent(
    TOWN_KINDS.find(
      (_kind, index): boolean => runningWeight(weights, index) > target,
    ),
    'a town kind',
  );
}

function runningWeight(
  weights: Readonly<Record<TownKind, number>>,
  index: number,
): number {
  return TOWN_KINDS.slice(0, index + 1).reduce(
    (sum, kind): number => sum + weights[kind],
    0,
  );
}
