import { compareByCodeUnitOrder } from '../../core/ids';
import { HEX_ORIGIN, hexDistance, hexId, hexOfId } from '../hex';
import type { HexCorner } from '../hex-corners';
import {
  cornerAcross,
  cornersOfHex,
  edgesAtCorner,
  hexCornerId,
} from '../hex-corners';
import type { HexPair } from '../hex-map';
import { hexPairId, isPassableTerrain } from '../hex-map';
import type { MapDraft, MapStep } from './map-draft';
import {
  countFor,
  pickSeededIfAny,
  seededChance,
  terrainAt,
} from './map-draft';

interface RiverCourse {
  readonly corner: HexCorner;
  readonly edges: readonly HexPair[];
  readonly visited: ReadonlySet<string>;
}

interface Bend {
  readonly edge: HexPair;
  readonly next: HexCorner;
  readonly outwardness: number;
}

/**
 * Rivers run along hex edges, from a corner by a mountain or lake (anywhere inland when there are none) down to
 * the coast, mostly the most direct way out and sometimes meandering. A river that cannot reach the coast is
 * dropped. Rivers never share an edge.
 */
export const drawRivers: MapStep = (draft) =>
  Array.from({
    length: countFor(draft, draft.rules.rivers.perPlayer),
  }).reduce<MapDraft>(
    (current, _unused, index): MapDraft => drawRiver(current, index),
    draft,
  );

function drawRiver(draft: MapDraft, index: number): MapDraft {
  return pickSeededIfAny(draft, riverSources(draft), 'river', index, 'source')
    .map(
      (corner): RiverCourse =>
        flow(
          draft,
          index,
          { corner, edges: [], visited: new Set([hexCornerId(corner)]) },
          0,
        ),
    )
    .filter((course): boolean => touchesSea(draft, course.corner))
    .reduce<MapDraft>(
      (current, course): MapDraft => ({
        ...current,
        rivers: [...current.rivers, ...course.edges],
      }),
      draft,
    );
}

/**
 * Corners to start a river from: mountain and lake hexes inside the ring of capitals, so rivers cross the land
 * between players; failing that any mountain or lake; failing that any land. Only corners with land all round.
 */
function riverSources(draft: MapDraft): readonly HexCorner[] {
  const ringRadius = Math.max(
    ...draft.capitals.map((capital): number =>
      hexDistance(HEX_ORIGIN, capital.hex),
    ),
  );
  const blocked = draft.land.filter(
    (hex): boolean =>
      !isPassableTerrain(terrainAt(draft, hexId(hex)), draft.terrainRules),
  );
  const inside = blocked.filter(
    (hex): boolean => hexDistance(HEX_ORIGIN, hex) < ringRadius,
  );
  return firstNonEmpty([inside, blocked, draft.land])
    .flatMap(cornersOfHex)
    .filter((corner): boolean =>
      corner.every((id): boolean => draft.onMap.has(id)),
    );
}

function firstNonEmpty<T>(lists: readonly (readonly T[])[]): readonly T[] {
  return lists.find((list): boolean => list.length > 0) ?? [];
}

function flow(
  draft: MapDraft,
  index: number,
  course: RiverCourse,
  step: number,
): RiverCourse {
  if (isRiverDone(draft, course, step)) {
    return course;
  }
  return nextBend(draft, index, course, step).reduce<RiverCourse>(
    (_current, bend): RiverCourse =>
      flow(
        draft,
        index,
        {
          corner: bend.next,
          edges: [...course.edges, bend.edge],
          visited: new Set([...course.visited, hexCornerId(bend.next)]),
        },
        step + 1,
      ),
    course,
  );
}

function isRiverDone(
  draft: MapDraft,
  course: RiverCourse,
  step: number,
): boolean {
  return (
    step >= draft.rules.rivers.maxLength || touchesSea(draft, course.corner)
  );
}

/** The bend most directly out to sea, or with the meander chance the next best; none when stuck. */
function nextBend(
  draft: MapDraft,
  index: number,
  course: RiverCourse,
  step: number,
): readonly Bend[] {
  const bends = possibleBends(draft, course).toSorted(
    (left, right): number =>
      right.outwardness - left.outwardness ||
      compareByCodeUnitOrder(hexPairId(left.edge), hexPairId(right.edge)),
  );
  const meanders = seededChance(
    draft,
    draft.rules.rivers.meanderChance,
    'river',
    index,
    step,
  );
  const preference = meanders
    ? [...bends.slice(1), ...bends.slice(0, 1)]
    : bends;
  return preference.slice(0, 1);
}

function possibleBends(draft: MapDraft, course: RiverCourse): readonly Bend[] {
  const taken = new Set([...draft.rivers, ...course.edges].map(hexPairId));
  return edgesAtCorner(course.corner)
    .filter(
      (edge): boolean =>
        !taken.has(hexPairId(edge)) && isInlandEdge(draft, edge),
    )
    .map((edge): Bend => {
      const next = cornerAcross(course.corner, edge);
      return { edge, next, outwardness: outwardnessOf(next) };
    })
    .filter((bend): boolean => !course.visited.has(hexCornerId(bend.next)));
}

function isInlandEdge(draft: MapDraft, edge: HexPair): boolean {
  return edge.every((id): boolean => draft.onMap.has(id));
}

/** A corner with sea on one side is where a river meets the coast. */
function touchesSea(draft: MapDraft, corner: HexCorner): boolean {
  return corner.some((id): boolean => !draft.onMap.has(id));
}

function outwardnessOf(corner: HexCorner): number {
  return corner.reduce(
    (sum, id): number => sum + hexDistance(HEX_ORIGIN, hexOfId(id)),
    0,
  );
}
