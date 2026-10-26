import { requirePresent } from '../../core/engine-error';
import type { PlayerId, ZoneId } from '../../core/ids';
import { compareByCodeUnitOrder } from '../../core/ids';
import { addUnitCounts, subtractUnitCounts } from '../../core/unit-counts';
import type { UnitCounts } from '../../core/unit-types';
import type { BattleResult, BattleSide } from '../../combat/battle';
import { resolveBattle } from '../../combat/resolve-battle';
import type { ZoneConnection } from '../../map/map-definition';
import { compareConnections, connectionKey } from '../../map/map-queries';
import type { AcceptedOrders, MoveOrder } from '../../orders/orders';
import type {
  ArmyMovedEvent,
  FieldBattleEvent,
} from '../../replay/replay-events';
import type { MatchState } from '../../state/match-state';
import {
  addUnitsToZone,
  findZone,
  setPlayerUnitsInZone,
  unitsOfPlayerInZone,
} from '../../state/match-state-queries';
import { createBattleSide } from '../battle-sides';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

/** All of one player's units travelling along one route this turn. */
interface MovingGroup {
  readonly playerId: PlayerId;
  readonly fromZoneId: ZoneId;
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

interface HeadOnClashResolution {
  readonly groups: readonly MovingGroup[];
  readonly events: readonly FieldBattleEvent[];
}

/**
 * All moves happen at once: every group leaves its zone, groups crossing the same connection in opposite
 * directions fight a field battle (no defender bonus), and the survivors arrive at their targets.
 */
export function applyMovementPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const groups = context.acceptedOrders.flatMap(mergeMoveOrdersByRoute);
  const afterDepartures = groups.reduce(departGroup, resolution.match);
  const clashes = resolveHeadOnClashes(groups, context);
  const afterArrivals = clashes.groups.reduce(arriveGroup, afterDepartures);
  return appendEvents(resolution, afterArrivals, [
    ...groups.map(
      (group): ArmyMovedEvent => toArmyMovedEvent(group, context.turnNumber),
    ),
    ...clashes.events,
  ]);
}

function mergeMoveOrdersByRoute(
  accepted: AcceptedOrders,
): readonly MovingGroup[] {
  return accepted.moves
    .reduce<
      readonly MovingGroup[]
    >((groups, move): readonly MovingGroup[] => mergeMoveIntoGroups(groups, accepted.playerId, move), [])
    .toSorted(compareGroupsByRoute);
}

function mergeMoveIntoGroups(
  groups: readonly MovingGroup[],
  playerId: PlayerId,
  move: MoveOrder,
): readonly MovingGroup[] {
  const existingGroup = groups.find((group): boolean =>
    isSameRoute(group, move),
  );
  return existingGroup === undefined
    ? [
        ...groups,
        {
          playerId,
          fromZoneId: move.fromZoneId,
          toZoneId: move.toZoneId,
          units: move.units,
        },
      ]
    : groups.map(
        (group): MovingGroup =>
          group === existingGroup
            ? { ...group, units: addUnitCounts(group.units, move.units) }
            : group,
      );
}

function isSameRoute(group: MovingGroup, move: MoveOrder): boolean {
  return (
    group.fromZoneId === move.fromZoneId && group.toZoneId === move.toZoneId
  );
}

function compareGroupsByRoute(left: MovingGroup, right: MovingGroup): number {
  return compareByCodeUnitOrder(routeKey(left), routeKey(right));
}

function routeKey(group: MovingGroup): string {
  return `${group.fromZoneId}>${group.toZoneId}`;
}

function departGroup(state: MatchState, group: MovingGroup): MatchState {
  const unitsInZone = unitsOfPlayerInZone(
    findZone(state, group.fromZoneId),
    group.playerId,
  );
  return setPlayerUnitsInZone(
    state,
    group.fromZoneId,
    group.playerId,
    subtractUnitCounts(unitsInZone, group.units),
  );
}

function arriveGroup(state: MatchState, group: MovingGroup): MatchState {
  return addUnitsToZone(state, group.toZoneId, group.playerId, group.units);
}

function resolveHeadOnClashes(
  groups: readonly MovingGroup[],
  context: TurnContext,
): HeadOnClashResolution {
  const clashingConnections = groups
    .filter(
      (group): boolean =>
        hasOpposingGroup(groups, group) && isTravellingInConnectionOrder(group),
    )
    .map((group): ZoneConnection => [group.fromZoneId, group.toZoneId])
    .toSorted(compareConnections);
  return clashingConnections.reduce(
    (resolution, connection): HeadOnClashResolution =>
      resolveClashOnConnection(resolution, connection, context),
    { groups, events: [] },
  );
}

function hasOpposingGroup(
  groups: readonly MovingGroup[],
  group: MovingGroup,
): boolean {
  return groups.some((other): boolean => isOpposingGroup(group, other));
}

function isOpposingGroup(group: MovingGroup, other: MovingGroup): boolean {
  return isReverseRoute(group, other) && other.playerId !== group.playerId;
}

function isReverseRoute(group: MovingGroup, other: MovingGroup): boolean {
  return (
    other.fromZoneId === group.toZoneId && other.toZoneId === group.fromZoneId
  );
}

/** Of the two groups in a clash, exactly one travels from the lower zone id to the higher one. */
function isTravellingInConnectionOrder(group: MovingGroup): boolean {
  return compareByCodeUnitOrder(group.fromZoneId, group.toZoneId) < 0;
}

function resolveClashOnConnection(
  resolution: HeadOnClashResolution,
  connection: ZoneConnection,
  context: TurnContext,
): HeadOnClashResolution {
  const clashKey = connectionKey(...connection);
  const clashingGroups = resolution.groups.filter(
    (group): boolean =>
      connectionKey(group.fromZoneId, group.toZoneId) === clashKey,
  );
  const battle = resolveBattle(
    clashingGroups.map(
      (group): BattleSide =>
        createBattleSide(
          group.playerId,
          group.units,
          'attacker',
          context.config.combat,
        ),
    ),
    context.config.combat,
  );
  return {
    groups: resolution.groups.map(
      (group): MovingGroup =>
        clashingGroups.includes(group)
          ? { ...group, units: survivingUnitsOf(battle, group.playerId) }
          : group,
    ),
    events: [
      ...resolution.events,
      {
        type: 'FieldBattle',
        turnNumber: context.turnNumber,
        connection,
        battle,
      },
    ],
  };
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
    fromZoneId: group.fromZoneId,
    toZoneId: group.toZoneId,
    units: group.units,
  };
}
