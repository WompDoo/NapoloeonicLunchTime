import { requirePresent } from '../../core/engine-error';
import { compareByCodeUnitOrder } from '../../core/ids';
import type { HexId } from '../hex';
import { hexOfId } from '../hex';
import type { HexPair } from '../hex-map';
import { hexPair, hexPairId, neighbourIdsOnMap } from '../hex-map';
import type { ShortestPaths, WeightedNeighbour } from '../hex-search';
import { pathTo, shortestPathsFrom } from '../hex-search';
import type { MapDraft, MapStep } from './map-draft';
import { terrainAt } from './map-draft';

interface Link {
  readonly from: HexId;
  readonly to: HexId;
  readonly cost: number;
}

interface Network {
  /** Which group of joined places each place is in. */
  readonly groups: ReadonlyMap<HexId, HexId>;
  readonly links: readonly Link[];
}

/**
 * Roads join every capital and town by the cheapest network: the cheapest link between two places that are not
 * yet joined is built first (Kruskal's algorithm over the cheapest paths). Each link follows the cheapest path,
 * so roads keep to easy ground and cross few rivers; where a road crosses a river it has a bridge.
 */
export const layRoads: MapStep = (draft) => {
  const places = [...draft.capitals, ...draft.towns]
    .map((place): HexId => place.id)
    .toSorted(compareByCodeUnitOrder);
  const rivers = new Set(draft.rivers.map(hexPairId));
  const paths = new Map(
    places.map((place): [HexId, ShortestPaths] => [
      place,
      shortestPathsFrom(place, (id): readonly WeightedNeighbour[] =>
        stepCosts(draft, rivers, id),
      ),
    ]),
  );
  const network = cheapestNetwork(places, paths);
  const stretches = network.links.flatMap((link): readonly HexPair[] =>
    stretchesOf(pathTo(pathsFrom(paths, link.from), link.from, link.to)),
  );
  const roads = uniquePairs(stretches);
  const roadHexes = roads.flat();
  return {
    ...draft,
    roads,
    bridges: roads.filter((road): boolean => rivers.has(hexPairId(road))),
    terrain: new Map([
      ...draft.terrain,
      ...roadHexes.map((id): [HexId, 'road'] => [id, 'road']),
    ]),
  };
};

/** What entering each passable neighbour costs: its terrain, plus the crossing when a river lies between. */
function stepCosts(
  draft: MapDraft,
  rivers: ReadonlySet<string>,
  id: HexId,
): readonly WeightedNeighbour[] {
  return neighbourIdsOnMap(hexOfId(id), draft.onMap).flatMap(
    (neighbour): readonly WeightedNeighbour[] => {
      const cost = draft.terrainRules.movementCost[terrainAt(draft, neighbour)];
      return cost === null
        ? []
        : [
            {
              id: neighbour,
              cost: cost + crossingCost(draft, rivers, hexPair(id, neighbour)),
            },
          ];
    },
  );
}

function crossingCost(
  draft: MapDraft,
  rivers: ReadonlySet<string>,
  edge: HexPair,
): number {
  return rivers.has(hexPairId(edge)) ? draft.terrainRules.riverCrossingCost : 0;
}

function cheapestNetwork(
  places: readonly HexId[],
  paths: ReadonlyMap<HexId, ShortestPaths>,
): Network {
  const candidates = places
    .flatMap((from, index): readonly Link[] =>
      places.slice(index + 1).map(
        (to): Link => ({
          from,
          to,
          cost: requirePresent(
            pathsFrom(paths, from).distance.get(to),
            `a path from ${from} to ${to}`,
          ),
        }),
      ),
    )
    .toSorted(
      (left, right): number =>
        left.cost - right.cost ||
        compareByCodeUnitOrder(
          `${left.from}|${left.to}`,
          `${right.from}|${right.to}`,
        ),
    );
  return candidates.reduce<Network>(
    (network, link): Network => joined(network, link),
    {
      groups: new Map(places.map((place): [HexId, HexId] => [place, place])),
      links: [],
    },
  );
}

/** Builds the link when it joins two groups, merging them; skips it when they are already joined. */
function joined(network: Network, link: Link): Network {
  const fromGroup = groupOf(network, link.from);
  const toGroup = groupOf(network, link.to);
  return fromGroup === toGroup
    ? network
    : {
        groups: new Map(
          [...network.groups].map(([place, group]): [HexId, HexId] => [
            place,
            group === toGroup ? fromGroup : group,
          ]),
        ),
        links: [...network.links, link],
      };
}

function groupOf(network: Network, place: HexId): HexId {
  return requirePresent(
    network.groups.get(place),
    `the road group of ${place}`,
  );
}

function pathsFrom(
  paths: ReadonlyMap<HexId, ShortestPaths>,
  place: HexId,
): ShortestPaths {
  return requirePresent(paths.get(place), `paths from ${place}`);
}

function stretchesOf(path: readonly HexId[]): readonly HexPair[] {
  return path
    .slice(1)
    .map(
      (id, index): HexPair =>
        hexPair(requirePresent(path[index], 'a road hex'), id),
    );
}

function uniquePairs(pairs: readonly HexPair[]): readonly HexPair[] {
  return [
    ...new Map(
      pairs.map((pair): [string, HexPair] => [hexPairId(pair), pair]),
    ).values(),
  ].toSorted((left, right): number =>
    compareByCodeUnitOrder(hexPairId(left), hexPairId(right)),
  );
}
