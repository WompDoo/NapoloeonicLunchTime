import { requirePresent } from '../../core/engine-error';
import type { PlayerId, ZoneId } from '../../core/ids';
import { compareByCodeUnitOrder } from '../../core/ids';
import { compareInOrder } from '../../core/ordering';
import {
  addUnitCounts,
  hasAnyUnits,
  subtractUnitCounts,
} from '../../core/unit-counts';
import type { UnitCounts } from '../../core/unit-types';
import type { BattleResult, BattleSide } from '../../combat/battle';
import { resolveBattle } from '../../combat/resolve-battle';
import type { RouteLeg } from '../../map/map-queries';
import {
  connectionKey,
  normaliseConnection,
  routeLegs,
} from '../../map/map-queries';
import { effectiveParameters } from '../../modifiers/effective-parameters';
import type { AcceptedOrders, MoveOrder } from '../../orders/orders';
import { moveRoute } from '../../orders/orders';
import type {
  ArmyMovedEvent,
  FieldBattleEvent,
  MoveBouncedEvent,
} from '../../replay/replay-events';
import type { MatchState } from '../../state/match-state';
import {
  addUnitsToZone,
  findZone,
  setPlayerUnitsInZone,
  unitsOfPlayerInZone,
} from '../../state/match-state-queries';
import { createFieldBattleSide } from '../battle-sides';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

const ROUTE_SEPARATOR = '>';

/** All of one player's units travelling along one route this turn. */
interface MovingGroup {
  readonly playerId: PlayerId;
  readonly route: readonly ZoneId[];
  readonly units: UnitCounts;
}

/** Two groups crossing the same connection in opposite directions. Indexes point into the moving groups. */
interface HeadOnClash {
  readonly firstIndex: number;
  readonly secondIndex: number;
  readonly leg: RouteLeg;
}

interface HeadOnClashResolution {
  readonly groups: readonly MovingGroup[];
  readonly events: readonly FieldBattleEvent[];
}

/**
 * All moves happen at once. Bounced moves stay home; every other group leaves its zone. Groups crossing the
 * same connection in opposite directions fight a field battle (no defender bonus), in connection order, and
 * the survivors arrive at their destinations.
 */
export function applyMovementPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const groups = context.acceptedOrders.flatMap(mergeMoveOrdersByRoute);
  const bouncedGroups = groups.filter((group): boolean =>
    bouncesTonight(group, groups, resolution.match, context),
  );
  const movingGroups = groups.filter(
    (group): boolean => !bouncedGroups.includes(group),
  );
  const afterDepartures = movingGroups.reduce(departGroup, resolution.match);
  const clashes = resolveHeadOnClashes(movingGroups, resolution.match, context);
  return appendEvents(
    resolution,
    clashes.groups.reduce(arriveGroup, afterDepartures),
    [
      ...bouncedGroups.map(
        (group): MoveBouncedEvent =>
          toMoveBouncedEvent(group, context.turnNumber),
      ),
      ...movingGroups.map(
        (group): ArmyMovedEvent => toArmyMovedEvent(group, context.turnNumber),
      ),
      ...clashes.events,
    ],
  );
}

function mergeMoveOrdersByRoute(
  accepted: AcceptedOrders,
): readonly MovingGroup[] {
  return accepted.moves
    .reduce<
      readonly MovingGroup[]
    >((groups, move): readonly MovingGroup[] => mergeMoveIntoGroups(groups, accepted.playerId, move), [])
    .toSorted((left, right): number =>
      compareByCodeUnitOrder(routeKey(left.route), routeKey(right.route)),
    );
}

function mergeMoveIntoGroups(
  groups: readonly MovingGroup[],
  playerId: PlayerId,
  move: MoveOrder,
): readonly MovingGroup[] {
  const route = moveRoute(move);
  const existingGroup = groups.find(
    (group): boolean => routeKey(group.route) === routeKey(route),
  );
  return existingGroup === undefined
    ? [...groups, { playerId, route, units: move.units }]
    : groups.map(
        (group): MovingGroup =>
          group === existingGroup
            ? { ...group, units: addUnitCounts(group.units, move.units) }
            : group,
      );
}

function routeKey(route: readonly ZoneId[]): string {
  return route.join(ROUTE_SEPARATOR);
}

function originOf(group: MovingGroup): ZoneId {
  return requirePresent(group.route[0], 'route origin');
}

function destinationOf(group: MovingGroup): ZoneId {
  return requirePresent(
    group.route[group.route.length - 1],
    'route destination',
  );
}

/**
 * Under a bounce modifier (Armistice), a move into a zone owned by another player stays home, and so do
 * moves of several players into the same neutral zone. Moves into your own zones never bounce. Between
 * turns an occupied zone is always owned by its occupier, so "occupied by others" is covered by ownership.
 */
function bouncesTonight(
  group: MovingGroup,
  groups: readonly MovingGroup[],
  state: MatchState,
  context: TurnContext,
): boolean {
  return (
    effectiveParameters(state, context.config, group.playerId, null)
      .foreignAndContestedMovesBounce &&
    isForeignOrContested(group, groups, state)
  );
}

function isForeignOrContested(
  group: MovingGroup,
  groups: readonly MovingGroup[],
  state: MatchState,
): boolean {
  const ownerId = findZone(state, destinationOf(group)).ownerId;
  return ownerId === null
    ? isContested(group, groups)
    : ownerId !== group.playerId;
}

function isContested(
  group: MovingGroup,
  groups: readonly MovingGroup[],
): boolean {
  return groups.some(
    (other): boolean =>
      other.playerId !== group.playerId &&
      destinationOf(other) === destinationOf(group),
  );
}

function departGroup(state: MatchState, group: MovingGroup): MatchState {
  const origin = originOf(group);
  const unitsInZone = unitsOfPlayerInZone(
    findZone(state, origin),
    group.playerId,
  );
  return setPlayerUnitsInZone(
    state,
    origin,
    group.playerId,
    subtractUnitCounts(unitsInZone, group.units),
  );
}

function arriveGroup(state: MatchState, group: MovingGroup): MatchState {
  return addUnitsToZone(
    state,
    destinationOf(group),
    group.playerId,
    group.units,
  );
}

function resolveHeadOnClashes(
  groups: readonly MovingGroup[],
  state: MatchState,
  context: TurnContext,
): HeadOnClashResolution {
  return findHeadOnClashes(groups).reduce(
    (resolution, clash): HeadOnClashResolution =>
      resolveClash(resolution, clash, state, context),
    { groups, events: [] },
  );
}

/**
 * Each pair of opposing groups clashes once, on the first connection they cross head-on. Clashes resolve in
 * connection order; on the same connection, in group order (seat, then route).
 */
function findHeadOnClashes(
  groups: readonly MovingGroup[],
): readonly HeadOnClash[] {
  return groups
    .flatMap((group, firstIndex): readonly HeadOnClash[] =>
      groups
        .map((_other, secondIndex): HeadOnClash | null =>
          findClashBetween(groups, firstIndex, secondIndex),
        )
        .filter(
          (clash): clash is HeadOnClash =>
            clash !== null && clash.firstIndex < clash.secondIndex,
        ),
    )
    .toSorted(
      compareInOrder<HeadOnClash>([
        (left, right): number =>
          compareByCodeUnitOrder(
            connectionKey(...left.leg),
            connectionKey(...right.leg),
          ),
        (left, right): number => left.firstIndex - right.firstIndex,
      ]),
    );
}

function findClashBetween(
  groups: readonly MovingGroup[],
  firstIndex: number,
  secondIndex: number,
): HeadOnClash | null {
  const leg = findLegCrossedByOpponents(
    requirePresent(groups[firstIndex], 'moving group'),
    requirePresent(groups[secondIndex], 'moving group'),
  );
  return leg === undefined ? null : { firstIndex, secondIndex, leg };
}

function findLegCrossedByOpponents(
  first: MovingGroup,
  second: MovingGroup,
): RouteLeg | undefined {
  return first.playerId === second.playerId
    ? undefined
    : findOpposedLeg(first, second);
}

function findOpposedLeg(
  first: MovingGroup,
  second: MovingGroup,
): RouteLeg | undefined {
  const secondLegKeys = routeLegs(second.route).map(
    ([fromZoneId, toZoneId]): string =>
      `${toZoneId}${ROUTE_SEPARATOR}${fromZoneId}`,
  );
  return routeLegs(first.route).find((leg): boolean =>
    secondLegKeys.includes(leg.join(ROUTE_SEPARATOR)),
  );
}

/** A group already destroyed by an earlier clash has nothing left to fight with. */
function resolveClash(
  resolution: HeadOnClashResolution,
  clash: HeadOnClash,
  state: MatchState,
  context: TurnContext,
): HeadOnClashResolution {
  const clashingGroups = [clash.firstIndex, clash.secondIndex].map(
    (index): MovingGroup =>
      requirePresent(resolution.groups[index], 'moving group'),
  );
  return clashingGroups.every((group): boolean => hasAnyUnits(group.units))
    ? fightClash(resolution, clash, clashingGroups, state, context)
    : resolution;
}

function fightClash(
  resolution: HeadOnClashResolution,
  clash: HeadOnClash,
  clashingGroups: readonly MovingGroup[],
  state: MatchState,
  context: TurnContext,
): HeadOnClashResolution {
  const battle = resolveBattle(
    clashingGroups.map(
      (group): BattleSide =>
        createFieldBattleSide(
          state,
          context.config,
          group.playerId,
          group.units,
        ),
    ),
    context.config.combat,
  );
  return {
    groups: resolution.groups.map(
      (group, index): MovingGroup =>
        isInClash(clash, index)
          ? { ...group, units: survivingUnitsOf(battle, group.playerId) }
          : group,
    ),
    events: [
      ...resolution.events,
      {
        type: 'FieldBattle',
        turnNumber: context.turnNumber,
        connection: normaliseConnection(...clash.leg),
        battle,
      },
    ],
  };
}

function isInClash(clash: HeadOnClash, index: number): boolean {
  return index === clash.firstIndex || index === clash.secondIndex;
}

function survivingUnitsOf(
  battle: BattleResult,
  playerId: PlayerId,
): UnitCounts {
  return requirePresent(
    battle.sides.find((side): boolean => side.playerId === playerId),
    `battle side of ${playerId}`,
  ).unitsRemaining;
}

function toArmyMovedEvent(
  group: MovingGroup,
  turnNumber: number,
): ArmyMovedEvent {
  return {
    type: 'ArmyMoved',
    turnNumber,
    playerId: group.playerId,
    fromZoneId: originOf(group),
    viaZoneIds: group.route.slice(1, group.route.length - 1),
    toZoneId: destinationOf(group),
    units: group.units,
  };
}

function toMoveBouncedEvent(
  group: MovingGroup,
  turnNumber: number,
): MoveBouncedEvent {
  return {
    type: 'MoveBounced',
    turnNumber,
    playerId: group.playerId,
    fromZoneId: originOf(group),
    toZoneId: destinationOf(group),
    units: group.units,
  };
}
