import { requirePresent } from '../core/engine-error';
import type { HexId } from './hex';

export interface WeightedNeighbour {
  readonly id: HexId;
  readonly cost: number;
}

/** The hexes one step away and what each step costs; impassable hexes are left out. */
export type NeighbourCosts = (id: HexId) => readonly WeightedNeighbour[];

export interface ShortestPaths {
  readonly distance: ReadonlyMap<HexId, number>;
  /** The hex each reached hex is entered from on its cheapest path. */
  readonly previous: ReadonlyMap<HexId, HexId>;
}

interface Search {
  readonly distance: Map<HexId, number>;
  readonly previous: Map<HexId, HexId>;
  readonly settled: Set<HexId>;
  readonly buckets: HexId[][];
}

/**
 * Cheapest paths from one hex, by Dial's algorithm: step costs are small whole numbers, so hexes wait in a
 * bucket per distance. Neighbours are visited in the order given and only a strictly cheaper path replaces
 * a known one, so ties always resolve the same way.
 */
export function shortestPathsFrom(
  source: HexId,
  neighbourCosts: NeighbourCosts,
): ShortestPaths {
  const search: Search = {
    distance: new Map([[source, 0]]),
    previous: new Map(),
    settled: new Set(),
    buckets: [[source]],
  };
  for (let distance = 0; distance < search.buckets.length; distance += 1) {
    settleBucket(search, distance, neighbourCosts);
  }
  return { distance: search.distance, previous: search.previous };
}

/** The hexes from the source to the target, both included. The target must have been reached. */
export function pathTo(
  paths: ShortestPaths,
  source: HexId,
  target: HexId,
): readonly HexId[] {
  return target === source
    ? [source]
    : [...pathTo(paths, source, previousOf(paths, target)), target];
}

/** Every hex reachable from the start through hexes the filter lets through. */
export function reachableFrom(
  start: HexId,
  neighbours: (id: HexId) => readonly HexId[],
): ReadonlySet<HexId> {
  const reached = new Set<HexId>([start]);
  const frontier: HexId[] = [start];
  for (let next = frontier.pop(); next !== undefined; next = frontier.pop()) {
    visitNeighbours(next, neighbours, reached, frontier);
  }
  return reached;
}

function visitNeighbours(
  id: HexId,
  neighbours: (id: HexId) => readonly HexId[],
  reached: Set<HexId>,
  frontier: HexId[],
): void {
  neighbours(id)
    .filter((neighbour): boolean => !reached.has(neighbour))
    .forEach((neighbour): void => {
      reached.add(neighbour);
      frontier.push(neighbour);
    });
}

function previousOf(paths: ShortestPaths, id: HexId): HexId {
  return requirePresent(paths.previous.get(id), `a path to hex ${id}`);
}

function settleBucket(
  search: Search,
  distance: number,
  neighbourCosts: NeighbourCosts,
): void {
  (search.buckets[distance] ?? []).forEach((id): void => {
    settle(search, id, distance, neighbourCosts);
  });
}

function settle(
  search: Search,
  id: HexId,
  distance: number,
  neighbourCosts: NeighbourCosts,
): void {
  if (isStale(search, id, distance)) {
    return;
  }
  search.settled.add(id);
  neighbourCosts(id).forEach((neighbour): void => {
    relax(search, id, neighbour.id, distance + neighbour.cost);
  });
}

/** A hex waits in every bucket it was ever queued in; only its cheapest entry counts. */
function isStale(search: Search, id: HexId, distance: number): boolean {
  return search.settled.has(id) || search.distance.get(id) !== distance;
}

function relax(search: Search, from: HexId, to: HexId, distance: number): void {
  if (isCheaper(search, to, distance)) {
    search.distance.set(to, distance);
    search.previous.set(to, from);
    bucketAt(search, distance).push(to);
  }
}

function isCheaper(search: Search, id: HexId, distance: number): boolean {
  return distance < (search.distance.get(id) ?? Number.POSITIVE_INFINITY);
}

function bucketAt(search: Search, distance: number): HexId[] {
  const bucket = search.buckets[distance] ?? [];
  search.buckets[distance] = bucket;
  return bucket;
}
