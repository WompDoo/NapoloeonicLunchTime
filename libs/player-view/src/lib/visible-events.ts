import type {
  AbilityUsedEvent,
  BattleFormedEvent,
  BattleOutcome,
  BattleResult,
  BattleRole,
  PlayerId,
  ReplayEvent,
  UnitCounts,
  ZoneId,
} from '@lunch-campaign/engine';
import { totalUnitCount, unitCountsOfSingleType } from '@lunch-campaign/engine';

/** An event about a player's units with their types hidden: only how many. */
export interface CountedEvent {
  readonly type:
    | 'UnitsRecruited'
    | 'UnitsGranted'
    | 'ArmyMoved'
    | 'MoveBounced'
    | 'ReinforcementsJoined'
    | 'Retreated'
    | 'RetreatBlocked'
    | 'UnitsLostToModifier';
  readonly turnNumber: number;
  readonly playerId: PlayerId;
  /** The zone, or the route from first to last. */
  readonly zoneIds: readonly ZoneId[];
  readonly count: number;
}

export interface FormedSideSummary {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  readonly count: number;
}

/** A battle forming, as seen by players outside it. */
export interface BattleFormedSummary {
  readonly type: 'BattleFormed';
  readonly turnNumber: number;
  readonly zoneId: ZoneId;
  readonly sides: readonly FormedSideSummary[];
}

export interface FoughtSideSummary {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  readonly unitsBefore: number;
  readonly unitsAfter: number;
}

/** A battle's counts and outcome, as seen by players outside it. */
export interface BattleOutcomeSummary {
  readonly type: 'FieldBattle' | 'BattleResolved';
  readonly turnNumber: number;
  /** The zone, or the two zones of a head-on clash. */
  readonly zoneIds: readonly ZoneId[];
  readonly sides: readonly FoughtSideSummary[];
  readonly outcome: BattleOutcome;
}

export type VisibleAbilityTarget =
  | { readonly kind: 'none' }
  | { readonly kind: 'ownedZone'; readonly zoneId: ZoneId }
  | {
      readonly kind: 'reinforcement';
      readonly fromZoneId: ZoneId;
      readonly toZoneId: ZoneId;
      readonly count: number;
    };

/** An ability revealed in the replay, with any unit types in its target hidden. */
export interface AbilityRevealed {
  readonly type: 'AbilityUsed';
  readonly turnNumber: number;
  readonly playerId: PlayerId;
  readonly commanderId: string;
  readonly abilityId: string;
  readonly target: VisibleAbilityTarget;
}

/** A replay event as one viewer may see it. */
export type VisibleEvent =
  | { readonly visibility: 'full'; readonly event: ReplayEvent }
  | { readonly visibility: 'counted'; readonly event: CountedEvent }
  | { readonly visibility: 'battleFormed'; readonly event: BattleFormedSummary }
  | {
      readonly visibility: 'battleOutcome';
      readonly event: BattleOutcomeSummary;
    }
  | { readonly visibility: 'abilityRevealed'; readonly event: AbilityRevealed };

type EventOfType<TType extends ReplayEvent['type']> = Extract<
  ReplayEvent,
  { readonly type: TType }
>;
/** A full replay event of a type others see as a count. */
export type CountedSource = EventOfType<CountedEvent['type']>;

interface RedactionInput<TEvent extends ReplayEvent> {
  readonly event: TEvent;
  readonly viewerId: PlayerId;
  /** The whole replay log, for events whose audience depends on another event (bombardment, combat). */
  readonly replayLog: readonly ReplayEvent[];
}

type Redaction = (
  input: RedactionInput<ReplayEvent>,
) => readonly VisibleEvent[];

type Redactions = {
  readonly [TType in ReplayEvent['type']]: (
    input: RedactionInput<EventOfType<TType>>,
  ) => readonly VisibleEvent[];
};

export interface CountedDetails {
  readonly zoneIds: readonly ZoneId[];
  readonly units: UnitCounts;
}

type CountedDetailReaders = {
  readonly [TType in CountedEvent['type']]: (
    event: EventOfType<TType>,
  ) => CountedDetails;
};

const NOT_VISIBLE: readonly VisibleEvent[] = [];

/** Where an event about a player's units happened, and which units: the parts others see as a count. */
const COUNTED_DETAILS: CountedDetailReaders = {
  UnitsRecruited: (event): CountedDetails => ({
    zoneIds: [event.zoneId],
    units: unitCountsOfSingleType(event.unitType, event.count),
  }),
  UnitsGranted: (event): CountedDetails => ({
    zoneIds: [event.zoneId],
    units: event.units,
  }),
  ArmyMoved: (event): CountedDetails => ({
    zoneIds: [event.fromZoneId, ...event.viaZoneIds, event.toZoneId],
    units: event.units,
  }),
  MoveBounced: (event): CountedDetails => ({
    zoneIds: [event.fromZoneId, event.toZoneId],
    units: event.units,
  }),
  ReinforcementsJoined: (event): CountedDetails => ({
    zoneIds: [event.fromZoneId, event.toZoneId],
    units: event.units,
  }),
  Retreated: (event): CountedDetails => ({
    zoneIds: [event.fromZoneId, event.toZoneId],
    units: event.units,
  }),
  RetreatBlocked: (event): CountedDetails => ({
    zoneIds: [event.zoneId],
    units: event.units,
  }),
  UnitsLostToModifier: (event): CountedDetails => ({
    zoneIds: [event.zoneId],
    units: event.units,
  }),
};

function shownToEveryone({
  event,
}: RedactionInput<ReplayEvent>): readonly VisibleEvent[] {
  return [{ visibility: 'full', event }];
}

function shownToOwnerOnly({
  event,
  viewerId,
}: RedactionInput<
  ReplayEvent & { readonly playerId: PlayerId }
>): readonly VisibleEvent[] {
  return event.playerId === viewerId
    ? [{ visibility: 'full', event }]
    : NOT_VISIBLE;
}

/** The owner sees their units in full; everyone else sees how many. */
function shownInFullToOwner({
  event,
  viewerId,
}: RedactionInput<CountedSource>): readonly VisibleEvent[] {
  return event.playerId === viewerId
    ? [{ visibility: 'full', event }]
    : [counted(event)];
}

const REDACTIONS: Redactions = {
  OrderRejected: shownToOwnerOnly,
  UnitsRecruited: shownInFullToOwner,
  UpgradeBought: shownToEveryone,
  AbilityUsed: ({ event, viewerId }): readonly VisibleEvent[] =>
    event.playerId === viewerId
      ? [{ visibility: 'full', event }]
      : [{ visibility: 'abilityRevealed', event: revealAbility(event) }],
  AbilityHadNoEffect: shownToEveryone,
  UnitsGranted: shownInFullToOwner,
  ArmyMoved: shownInFullToOwner,
  MoveBounced: shownInFullToOwner,
  ReinforcementsJoined: shownInFullToOwner,
  Retreated: shownInFullToOwner,
  RetreatBlocked: shownInFullToOwner,
  UnitsLostToModifier: shownInFullToOwner,
  FieldBattle: ({ event, viewerId }): readonly VisibleEvent[] =>
    isOnASide(event.battle, viewerId)
      ? [{ visibility: 'full', event }]
      : [
          {
            visibility: 'battleOutcome',
            event: summariseOutcome(
              event.type,
              event.turnNumber,
              [...event.connection],
              event.battle,
            ),
          },
        ],
  BattleFormed: ({ event, viewerId }): readonly VisibleEvent[] =>
    isFormedWith(event, viewerId)
      ? [{ visibility: 'full', event }]
      : [{ visibility: 'battleFormed', event: summariseFormation(event) }],
  Bombardment: ({ event, viewerId, replayLog }): readonly VisibleEvent[] =>
    isInZoneBattle(
      replayLog,
      { turnNumber: event.turnNumber, zoneId: event.targetZoneId },
      viewerId,
    )
      ? [{ visibility: 'full', event }]
      : NOT_VISIBLE,
  BattleDecidedByBombardment: shownToEveryone,
  BattleResolved: ({ event, viewerId, replayLog }): readonly VisibleEvent[] =>
    isInZoneBattle(replayLog, event, viewerId)
      ? [{ visibility: 'full', event }]
      : [
          {
            visibility: 'battleOutcome',
            event: summariseOutcome(
              event.type,
              event.turnNumber,
              [event.zoneId],
              event.battle,
            ),
          },
        ],
  ZoneCaptured: shownToEveryone,
  SupplyProduced: shownToOwnerOnly,
  PointsAwarded: shownToEveryone,
  PlayerEliminated: shownToEveryone,
  ModifierExpired: shownToEveryone,
  EventAnnounced: shownToEveryone,
  StandingsRecorded: shownToEveryone,
};

/**
 * Filters replay events for one viewer. Players see their own units in full and everyone else's as counts.
 * Battle compositions, bombardment and strengths are shown only to players in that battle; others see each
 * side's counts before and after, and the outcome. Supply and rejected orders are private.
 */
export function visibleEventsFor(
  events: readonly ReplayEvent[],
  viewerId: PlayerId,
  replayLog: readonly ReplayEvent[],
): readonly VisibleEvent[] {
  return events.flatMap((event): readonly VisibleEvent[] => {
    const redact = REDACTIONS[event.type] as Redaction;
    return redact({ event, viewerId, replayLog });
  });
}

/** The zones and units of an event about a player's units: the parts others see only as a count. */
export function countedEventDetails(event: CountedSource): CountedDetails {
  const readDetails = COUNTED_DETAILS[event.type] as (
    event: CountedSource,
  ) => CountedDetails;
  return readDetails(event);
}

function counted(event: CountedSource): VisibleEvent {
  const details = countedEventDetails(event);
  return {
    visibility: 'counted',
    event: {
      type: event.type,
      turnNumber: event.turnNumber,
      playerId: event.playerId,
      zoneIds: details.zoneIds,
      count: totalUnitCount(details.units),
    },
  };
}

function revealAbility(event: AbilityUsedEvent): AbilityRevealed {
  return {
    type: 'AbilityUsed',
    turnNumber: event.turnNumber,
    playerId: event.playerId,
    commanderId: event.commanderId,
    abilityId: event.abilityId,
    target:
      event.target.kind === 'reinforcement'
        ? {
            kind: 'reinforcement',
            fromZoneId: event.target.fromZoneId,
            toZoneId: event.target.toZoneId,
            count: totalUnitCount(event.target.units),
          }
        : event.target,
  };
}

function isOnASide(battle: BattleResult, viewerId: PlayerId): boolean {
  return battle.sides.some((side): boolean => side.playerId === viewerId);
}

function isFormedWith(formed: BattleFormedEvent, viewerId: PlayerId): boolean {
  return formed.sides.some((side): boolean => side.playerId === viewerId);
}

interface ZoneBattleKey {
  readonly turnNumber: number;
  readonly zoneId: ZoneId;
}

/** Players in a zone battle are the sides it formed with, including any destroyed by bombardment. */
function isInZoneBattle(
  replayLog: readonly ReplayEvent[],
  key: ZoneBattleKey,
  viewerId: PlayerId,
): boolean {
  return replayLog.some(
    (event): boolean =>
      isFormationOf(event, key) &&
      isFormedWith(event as BattleFormedEvent, viewerId),
  );
}

function isFormationOf(event: ReplayEvent, key: ZoneBattleKey): boolean {
  return event.type === 'BattleFormed' && isSameZoneBattle(event, key);
}

function isSameZoneBattle(event: ZoneBattleKey, key: ZoneBattleKey): boolean {
  return event.turnNumber === key.turnNumber && event.zoneId === key.zoneId;
}

function summariseFormation(event: BattleFormedEvent): BattleFormedSummary {
  return {
    type: 'BattleFormed',
    turnNumber: event.turnNumber,
    zoneId: event.zoneId,
    sides: event.sides.map(
      (side): FormedSideSummary => ({
        playerId: side.playerId,
        role: side.role,
        count: totalUnitCount(side.units),
      }),
    ),
  };
}

function summariseOutcome(
  type: BattleOutcomeSummary['type'],
  turnNumber: number,
  zoneIds: readonly ZoneId[],
  battle: BattleResult,
): BattleOutcomeSummary {
  return {
    type,
    turnNumber,
    zoneIds,
    sides: battle.sides.map(
      (side): FoughtSideSummary => ({
        playerId: side.playerId,
        role: side.role,
        unitsBefore: totalUnitCount(side.unitsBefore),
        unitsAfter: totalUnitCount(side.unitsRemaining),
      }),
    ),
    outcome: battle.outcome,
  };
}
