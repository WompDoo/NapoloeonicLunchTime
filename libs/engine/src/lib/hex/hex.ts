import { requirePresent } from '../core/engine-error';
import { compareByCodeUnitOrder } from '../core/ids';

/** A hex in axial coordinates. On pointy-top hexes, q grows to the east and r to the south-east. */
export interface Hex {
  readonly q: number;
  readonly r: number;
}

/** `"q,r"`. Lists of hexes sort by id. */
export type HexId = string & { readonly brand: 'HexId' };

const ID_SEPARATOR = ',';
const DISTANCE_DIVISOR = 2;

/** The six neighbour offsets, clockwise from east. */
export const HEX_DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];

export const HEX_ORIGIN: Hex = { q: 0, r: 0 };

export function hexId(hex: Hex): HexId {
  return `${hex.q}${ID_SEPARATOR}${hex.r}` as HexId;
}

export function hexOfId(id: HexId): Hex {
  const [q, r] = id.split(ID_SEPARATOR).map(Number);
  return {
    q: requirePresent(q, `q of hex ${id}`),
    r: requirePresent(r, `r of hex ${id}`),
  };
}

export function compareHexIds(left: HexId, right: HexId): number {
  return compareByCodeUnitOrder(left, right);
}

export function addHexes(left: Hex, right: Hex): Hex {
  return { q: left.q + right.q, r: left.r + right.r };
}

export function subtractHexes(left: Hex, right: Hex): Hex {
  return { q: left.q - right.q, r: left.r - right.r };
}

/** The number of moves between two hexes on open ground. */
export function hexDistance(from: Hex, to: Hex): number {
  const offset = subtractHexes(to, from);
  return (
    (Math.abs(offset.q) + Math.abs(offset.r) + Math.abs(offset.q + offset.r)) /
    DISTANCE_DIVISOR
  );
}

export function hexNeighbours(hex: Hex): readonly Hex[] {
  return HEX_DIRECTIONS.map((direction): Hex => addHexes(hex, direction));
}

export function areHexesAdjacent(left: Hex, right: Hex): boolean {
  return hexDistance(left, right) === 1;
}

/** Every hex within `radius` moves of `centre`, sorted by id. */
export function hexesWithin(centre: Hex, radius: number): readonly Hex[] {
  return integersFrom(-radius, radius)
    .flatMap((dq): readonly Hex[] =>
      integersFrom(
        Math.max(-radius, -dq - radius),
        Math.min(radius, radius - dq),
      ).map((dr): Hex => addHexes(centre, { q: dq, r: dr })),
    )
    .toSorted((left, right): number =>
      compareHexIds(hexId(left), hexId(right)),
    );
}

/** One sixth of a turn clockwise around the origin. Distances between hexes are unchanged. */
export function rotateHex(hex: Hex): Hex {
  return { q: -hex.r, r: hex.q + hex.r };
}

export function rotateHexBy(hex: Hex, sixths: number): Hex {
  return Array.from({ length: sixths }).reduce<Hex>(
    (rotated): Hex => rotateHex(rotated),
    hex,
  );
}

/** The mirror image across the line q = r. Distances between hexes are unchanged. */
export function reflectHex(hex: Hex): Hex {
  return { q: hex.r, r: hex.q };
}

function integersFrom(first: number, last: number): readonly number[] {
  return Array.from(
    { length: Math.max(last - first + 1, 0) },
    (_unused, index): number => first + index,
  );
}
