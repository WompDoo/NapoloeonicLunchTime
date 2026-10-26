import type {
  EffectiveParameters,
  MatchConfig,
  MatchState,
  PlayerId,
  PlayerState,
  ReplayEvent,
  ZoneState,
} from '@lunch-campaign/engine';
import {
  activeModifiersInOrder,
  effectiveParameters,
  findPlayer,
  findZoneDefinition,
  isMatchFinished,
  requirePresent,
  totalUnitCount,
  unitsOfPlayerInZone,
} from '@lunch-campaign/engine';
import type { MatchScore } from '@lunch-campaign/honours';
import { scoreMatch } from '@lunch-campaign/honours';
import { honourStandings } from './honour-standings';
import { canSpyToday } from './spy-on-zone';
import type {
  ArmyVisibility,
  MatchLogs,
  OwnPlayerView,
  PlayerView,
  PublicPlayerView,
  ZoneView,
} from './player-view';
import type { SpyReport } from './spy-report';
import { visibleEventsFor } from './visible-events';

const HIDDEN: ArmyVisibility = { kind: 'hidden' };

/**
 * The only path from engine state to anything a player sees. Builds every field from scratch: other
 * players' compositions, supply, orders and the match seed never enter a view.
 */
export function filterForPlayer(
  state: MatchState,
  logs: MatchLogs,
  viewerId: PlayerId,
  config: MatchConfig,
): PlayerView {
  const viewer = findPlayer(state, viewerId);
  const parameters = effectiveParameters(state, config, viewerId, null);
  return {
    viewerId,
    turnNumber: state.turnNumber,
    ...matchProgress(state, logs, config),
    me: {
      ...publicPlayer(viewer),
      supply: viewer.supply,
    } satisfies OwnPlayerView,
    players: state.players.map(publicPlayer),
    zones: state.zones.map(
      (zone): ZoneView => zoneView(zone, viewerId, parameters, config),
    ),
    connections: config.map.connections,
    activeEventIds: activeModifiersInOrder(state, config).flatMap(
      (modifier): readonly string[] =>
        modifier.source.kind === 'event' ? [modifier.source.eventId] : [],
    ),
    spiesAvailable: canSpyToday(state, config, viewerId),
    spyCost: parameters.spyCost,
    unitCountsVisible: parameters.unitCountsVisible,
    honours: honourStandings(state, logs, config),
    lastNight: visibleEventsFor(
      lastNightOf(logs.replayLog, state.turnNumber),
      viewerId,
      logs.replayLog,
    ),
    spyReports: logs.spyLog.filter(
      (spyReport): boolean =>
        spyReport.playerId === viewerId &&
        spyReport.turnNumber === state.turnNumber,
    ) satisfies readonly SpyReport[],
  };
}

function publicPlayer(player: PlayerState): PublicPlayerView {
  return {
    playerId: player.playerId,
    seat: player.seat,
    commanderId: player.commanderId,
    score: player.score,
    upgrades: player.upgrades,
    abilityUsed: player.abilityUsed,
    eliminated: player.eliminated,
  };
}

function zoneView(
  zone: ZoneState,
  viewerId: PlayerId,
  parameters: EffectiveParameters,
  config: MatchConfig,
): ZoneView {
  const definition = findZoneDefinition(config.map, zone.zoneId);
  return {
    zoneId: zone.zoneId,
    kind: definition.kind,
    position: definition.position,
    ownerId: zone.ownerId,
    army: armyVisibility(zone, viewerId, parameters),
  };
}

/** Your own zones in full; others' as a count, unless counts are hidden today (Fog). */
function armyVisibility(
  zone: ZoneState,
  viewerId: PlayerId,
  parameters: EffectiveParameters,
): ArmyVisibility {
  return zone.ownerId === viewerId
    ? { kind: 'composition', units: unitsOfPlayerInZone(zone, viewerId) }
    : othersArmy(zone, parameters);
}

function othersArmy(
  zone: ZoneState,
  parameters: EffectiveParameters,
): ArmyVisibility {
  return parameters.unitCountsVisible
    ? {
        kind: 'count',
        count: zone.armies.reduce(
          (total, army): number => total + totalUnitCount(army.units),
          0,
        ),
      }
    : HIDDEN;
}

type MatchProgress = Pick<PlayerView, 'dayLabel' | 'finalScore'>;

/** During the week: today's label. After Friday night: no day, and the final score. */
function matchProgress(
  state: MatchState,
  logs: MatchLogs,
  config: MatchConfig,
): MatchProgress {
  return isMatchFinished(state, config)
    ? { dayLabel: null, finalScore: finalScoreOf(state, logs, config) }
    : { dayLabel: dayLabelOf(state, config), finalScore: null };
}

function dayLabelOf(state: MatchState, config: MatchConfig): string {
  return requirePresent(
    config.schedule[state.turnNumber - 1],
    `schedule entry for turn ${state.turnNumber}`,
  ).label;
}

/** The replay of the latest resolved night. */
function lastNightOf(
  replayLog: readonly ReplayEvent[],
  turnNumber: number,
): readonly ReplayEvent[] {
  return replayLog.filter(
    (event): boolean => event.turnNumber === turnNumber - 1,
  );
}

function finalScoreOf(
  state: MatchState,
  logs: MatchLogs,
  config: MatchConfig,
): MatchScore {
  return scoreMatch(
    { replayLog: logs.replayLog, spyLog: logs.spyLog },
    state.honourIds,
    config,
  );
}
