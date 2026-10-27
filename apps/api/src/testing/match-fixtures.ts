import type { PlayerId } from '@lunch-campaign/engine';
import { toPlayerId } from '@lunch-campaign/engine';
import {
  joinLobby,
  openLobby,
  pickCommander,
  setReady,
} from '../app/matches/lobby';
import { DEFAULT_MATCH_SETTINGS } from '../app/matches/match-settings';
import type { StoredMatch } from '../app/matches/stored-match';

export const SETTINGS = DEFAULT_MATCH_SETTINGS;
export const TALLINN = 'Europe/Tallinn';
/** 09:00 in Tallinn on Monday 2 November 2026. */
export const MONDAY_MORNING = new Date('2026-11-02T07:00:00Z');
export const PLAYERS: readonly PlayerId[] = [
  'player-a',
  'player-b',
  'player-c',
  'player-d',
].map(toPlayerId);

export function emptyLobby(now: Date): StoredMatch {
  return openLobby({
    matchId: 'match-1',
    inviteCode: 'invite-1',
    timeZone: TALLINN,
    now,
  });
}

/** A lobby the first `count` players have joined, with no picks yet. */
export function lobbyOf(count: number, now: Date): StoredMatch {
  return PLAYERS.slice(0, count).reduce(
    (match, playerId) =>
      joinLobby(match, { playerId, name: `Name of ${playerId}` }, SETTINGS),
    emptyLobby(now),
  );
}

/** Everyone picks the given commander, in player order, then presses ready: the match starts. */
export function startedMatch(
  commanderIds: readonly string[],
  now: Date,
  matchSeed: string,
): StoredMatch {
  const picked = commanderIds.reduce(
    (match, commanderId, index) =>
      pickCommander(match, playerAt(index), commanderId, SETTINGS),
    lobbyOf(commanderIds.length, now),
  );
  return commanderIds.reduce(
    (match, _commanderId, index) =>
      setReady(
        match,
        playerAt(index),
        true,
        { now, drawMatchSeed: () => matchSeed },
        SETTINGS,
      ),
    picked,
  );
}

export function playerAt(index: number): PlayerId {
  const playerId = PLAYERS[index];
  if (playerId === undefined) {
    throw new Error(`The fixtures have ${PLAYERS.length} players`);
  }
  return playerId;
}

/** The started part of a match, for tests that need it. */
export function playOf(match: StoredMatch): NonNullable<StoredMatch['play']> {
  if (match.play === null) {
    throw new Error('The match has not started');
  }
  return match.play;
}
