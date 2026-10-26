import type {
  MatchConfig,
  MatchState,
  PlayerId,
  ReplayEvent,
} from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import type { MatchRecord } from '@lunch-campaign/honours';
import {
  awardHonour,
  createHonourContext,
  HONOUR_QUERIES,
  requireHonourId,
} from '@lunch-campaign/honours';
import type {
  HonourStandingEntry,
  HonourStandingView,
  MatchLogs,
} from './player-view';

/** Current standings for the match's honours: who would earn each if the match ended after the last night. */
export function honourStandings(
  state: MatchState,
  logs: MatchLogs,
  config: MatchConfig,
): readonly HonourStandingView[] {
  return hasResolvedNight(logs.replayLog)
    ? state.honourIds.map(
        (honourId): HonourStandingView =>
          standingOf(honourId, state, logs, config),
      )
    : state.honourIds.map(
        (honourId): HonourStandingView => notYetContested(honourId, config),
      );
}

function hasResolvedNight(replayLog: readonly ReplayEvent[]): boolean {
  return replayLog.some((event): boolean => event.type === 'StandingsRecorded');
}

function standingOf(
  honourId: string,
  state: MatchState,
  logs: MatchLogs,
  config: MatchConfig,
): HonourStandingView {
  const record: MatchRecord = {
    replayLog: logs.replayLog,
    spyLog: logs.spyLog,
  };
  const context = createHonourContext(record);
  const id = requireHonourId(honourId);
  const query = HONOUR_QUERIES[id];
  const playerIds = state.players.map((player): PlayerId => player.playerId);
  const award = awardHonour(context, id, pointsOf(honourId, config), playerIds);
  return {
    honourId,
    points: award.points,
    leaderIds: award.winnerIds,
    entries: playerIds.map(
      (playerId): HonourStandingEntry => ({
        playerId,
        value: query.measure(context, playerId),
        eligible: query.isEligible(context, playerId),
      }),
    ),
  };
}

function notYetContested(
  honourId: string,
  config: MatchConfig,
): HonourStandingView {
  return {
    honourId,
    points: pointsOf(honourId, config),
    leaderIds: [],
    entries: [],
  };
}

function pointsOf(honourId: string, config: MatchConfig): number {
  return requirePresent(
    config.honours.pool.find((honour): boolean => honour.id === honourId),
    `honour ${honourId} in the match config`,
  ).points;
}
