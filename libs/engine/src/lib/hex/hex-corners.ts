import { requirePresent } from '../core/engine-error';
import type { Hex, HexId } from './hex';
import {
  addHexes,
  areHexesAdjacent,
  compareHexIds,
  HEX_DIRECTIONS,
  hexId,
  hexNeighbours,
  hexOfId,
} from './hex';
import type { HexPair } from './hex-map';
import { hexPair } from './hex-map';

/** A corner where three hexes meet, as their ids in id order. Rivers run from corner to corner. */
export type HexCorner = readonly [HexId, HexId, HexId];

export function hexCorner(
  first: HexId,
  second: HexId,
  third: HexId,
): HexCorner {
  const [a, b, c] = [first, second, third].toSorted(compareHexIds);
  return [
    requirePresent(a, 'corner hex'),
    requirePresent(b, 'corner hex'),
    requirePresent(c, 'corner hex'),
  ];
}

export function hexCornerId(corner: HexCorner): string {
  return corner.join('|');
}

/** The six corners of a hex: each lies between two neighbouring directions. */
export function cornersOfHex(hex: Hex): readonly HexCorner[] {
  return HEX_DIRECTIONS.map(
    (direction, index): HexCorner =>
      hexCorner(
        hexId(hex),
        hexId(addHexes(hex, direction)),
        hexId(addHexes(hex, nextDirection(index))),
      ),
  );
}

/** The three edges that meet at a corner. */
export function edgesAtCorner(corner: HexCorner): readonly HexPair[] {
  const [a, b, c] = corner;
  return [hexPair(a, b), hexPair(b, c), hexPair(a, c)];
}

/** The corner at the other end of an edge that starts at this corner. */
export function cornerAcross(corner: HexCorner, edge: HexPair): HexCorner {
  const [left, right] = edge;
  const third = requirePresent(
    corner.find((id): boolean => !edge.includes(id)),
    'the corner hex off the edge',
  );
  const other = requirePresent(
    commonNeighbours(hexOfId(left), hexOfId(right)).find(
      (id): boolean => id !== third,
    ),
    'the hex across the edge',
  );
  return hexCorner(left, right, other);
}

/** Two adjacent hexes share exactly two neighbours: the hexes at either end of the edge between them. */
function commonNeighbours(left: Hex, right: Hex): readonly HexId[] {
  return hexNeighbours(left)
    .filter((neighbour): boolean => areHexesAdjacent(neighbour, right))
    .map(hexId);
}

function nextDirection(index: number): Hex {
  return requirePresent(
    HEX_DIRECTIONS[(index + 1) % HEX_DIRECTIONS.length],
    'the next direction',
  );
}
