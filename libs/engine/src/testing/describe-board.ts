import type { BattleOutcome, BattleResult } from '../lib/combat/battle';
import type { MatchConfig } from '../lib/config/match-config';
import type { UnitCounts } from '../lib/core/unit-types';
import { findZoneDefinition } from '../lib/map/map-queries';
import type { ReplayEvent } from '../lib/replay/replay-events';
import type { MatchState, ZoneState } from '../lib/state/match-state';

const KIND_COLUMN_WIDTH = 7;
const OWNER_COLUMN_WIDTH = 3;
const UNIT_ABBREVIATIONS = {
  line: 'L',
  cavalry: 'C',
  skirmishers: 'S',
  artillery: 'A',
} as const;

/**
 * A compact, omniscient text dump of a resolved turn for snapshot tests. This is a test aid, not the
 * player-facing ASCII renderer (Milestone 4), which only ever sees a filtered PlayerView.
 */
export function describeTurn(
  state: MatchState,
  replayLog: readonly ReplayEvent[],
  config: MatchConfig,
): string {
  return [
    `turn ${state.turnNumber}`,
    ...state.players.map(
      (player): string =>
        `${player.playerId} seat ${player.seat} supply ${player.supply} score ${player.score}`,
    ),
    ...state.zones.map((zone): string => describeZone(zone, config)),
    'log:',
    ...replayLog.map(describeEvent),
  ].join('\n');
}

function describeZone(zone: ZoneState, config: MatchConfig): string {
  const kind = findZoneDefinition(config.map, zone.zoneId).kind.padEnd(
    KIND_COLUMN_WIDTH,
  );
  const owner = (zone.ownerId ?? '--').padEnd(OWNER_COLUMN_WIDTH);
  const armies = zone.armies
    .map((army): string => `${army.playerId}:${describeUnits(army.units)}`)
    .join(' ');
  return `${zone.zoneId} ${kind} ${owner} ${armies}`.trimEnd();
}

export function describeUnits(units: UnitCounts): string {
  const parts = (Object.keys(UNIT_ABBREVIATIONS) as (keyof UnitCounts)[])
    .filter((unitType): boolean => units[unitType] > 0)
    .map(
      (unitType): string => `${UNIT_ABBREVIATIONS[unitType]}${units[unitType]}`,
    );
  return parts.length === 0 ? '-' : parts.join('');
}

type EventDescribers = {
  readonly [TType in ReplayEvent['type']]: (
    event: Extract<ReplayEvent, { readonly type: TType }>,
  ) => string;
};

const EVENT_DESCRIBERS: EventDescribers = {
  OrderRejected: (event): string =>
    `  rejected ${event.playerId} order #${event.orderIndex} (${event.order.kind}): ${event.reason}`,
  UnitsRecruited: (event): string =>
    `  recruited ${event.playerId} ${event.count} ${event.unitType} at ${event.zoneId} for ${event.cost}`,
  UpgradeBought: (event): string =>
    `  upgrade ${event.playerId} ${event.upgradeId} for ${event.cost}`,
  AbilityUsed: (event): string =>
    `  ability ${event.playerId} ${event.abilityId} (${event.target.kind})`,
  AbilityHadNoEffect: (event): string =>
    `  ability had no effect: ${event.playerId} ${event.modifierId}`,
  UnitsGranted: (event): string =>
    `  granted ${event.playerId} ${describeUnits(event.units)} at ${event.zoneId} by ${event.modifierId}`,
  ArmyMoved: (event): string =>
    `  moved ${event.playerId} ${describeUnits(event.units)} ${[event.fromZoneId, ...event.viaZoneIds, event.toZoneId].join('->')}`,
  MoveBounced: (event): string =>
    `  bounced ${event.playerId} ${describeUnits(event.units)} ${event.fromZoneId}->${event.toZoneId}`,
  FieldBattle: (event): string =>
    `  field ${event.connection.join('-')}: ${describeBattle(event.battle)}`,
  ReinforcementsJoined: (event): string =>
    `  joined ${event.playerId} ${describeUnits(event.units)} ${event.fromZoneId}->${event.toZoneId}`,
  Bombardment: (event): string =>
    `  bombard ${event.playerId} ${event.artillery} guns ${event.fromZoneId}->${event.targetZoneId}: ${event.hits
      .map((hit): string => `${hit.playerId}:${hit.unitType}`)
      .join(' ')} blocked ${event.blockedHits} wasted ${event.wastedHits}`,
  BattleFormed: (event): string =>
    `  battle formed ${event.zoneId}: ${event.sides
      .map(
        (side): string =>
          `${side.playerId}(${side.role}) ${describeUnits(side.units)}`,
      )
      .join(' vs ')}`,
  BattleDecidedByBombardment: (event): string =>
    `  decided by bombardment ${event.zoneId}: ${event.survivorId ?? 'nobody'} left standing`,
  BattleResolved: (event): string =>
    `  battle ${event.zoneId}: ${describeBattle(event.battle)}`,
  Retreated: (event): string =>
    `  retreated ${event.playerId} ${describeUnits(event.units)} ${event.fromZoneId}->${event.toZoneId}`,
  RetreatBlocked: (event): string =>
    `  retreat blocked ${event.playerId} ${describeUnits(event.units)} at ${event.zoneId}`,
  ZoneCaptured: (event): string =>
    `  captured ${event.zoneId} by ${event.newOwnerId} from ${event.previousOwnerId ?? 'neutral'}`,
  UnitsLostToModifier: (event): string =>
    `  lost ${event.playerId} ${describeUnits(event.units)} at ${event.zoneId} to ${event.modifierId}`,
  SupplyProduced: (event): string =>
    `  produced ${event.playerId} +${event.amount}`,
  PointsAwarded: (event): string =>
    `  points ${event.playerId} +${event.points} (${event.citiesHeld} cities)`,
  PlayerEliminated: (event): string => `  eliminated ${event.playerId}`,
  ModifierExpired: (event): string => `  expired ${event.modifierId}`,
  StandingsRecorded: (event): string =>
    `  standings ${event.standings
      .map(
        (standing): string =>
          `${standing.playerId}:${standing.units}u/${standing.zonesOwned}z/${standing.citiesHeld}c/${standing.score}p`,
      )
      .join(' ')}`,
  EventAnnounced: (event): string =>
    `  event ${event.eventId} announced for turn ${event.activeTurnNumber}`,
};

function describeEvent(event: ReplayEvent): string {
  const describer = EVENT_DESCRIBERS[event.type] as (
    event: ReplayEvent,
  ) => string;
  return describer(event);
}

function describeBattle(battle: BattleResult): string {
  const sides = battle.sides
    .map(
      (side): string =>
        `${side.playerId}(${side.role}) ${describeUnits(side.unitsBefore)} S=${side.strength.totalStrength.toFixed(3)} -> ${describeUnits(side.unitsRemaining)}`,
    )
    .join(' vs ');
  return `${sides}; ${describeOutcome(battle.outcome)}`;
}

function describeOutcome(outcome: BattleOutcome): string {
  return outcome.kind === 'victory'
    ? `winner ${outcome.winnerId}`
    : 'mutual destruction';
}
