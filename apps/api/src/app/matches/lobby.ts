import type { MatchEntrant, PlayerId } from '@lunch-campaign/engine';
import { createInitialMatchState, drawSeating } from '@lunch-campaign/engine';
import { isKnownTimeZone, planMatchCalendar } from '../calendar/match-calendar';
import { domainError } from '../errors/domain-error';
import type { MatchSettings } from './match-settings';
import { maximumPlayers } from './match-settings';
import type { LobbyMember, ReadyMember, StoredMatch } from './stored-match';
import { isReadyMember } from './stored-match';

export interface NewLobby {
  readonly matchId: string;
  readonly inviteCode: string;
  readonly timeZone: string;
  readonly now: Date;
}

export interface NewMember {
  readonly playerId: PlayerId;
  readonly name: string;
}

/** What starting a match needs from outside the rules: the time, and a fresh seed, drawn only on start. */
export interface MatchStart {
  readonly now: Date;
  readonly drawMatchSeed: () => string;
}

export function openLobby(lobby: NewLobby): StoredMatch {
  if (!isKnownTimeZone(lobby.timeZone)) {
    throw domainError(
      'lobby.unknownTimeZone',
      `Unknown time zone ${lobby.timeZone}`,
    );
  }
  return {
    matchId: lobby.matchId,
    inviteCode: lobby.inviteCode,
    timeZone: lobby.timeZone,
    createdAt: lobby.now.toISOString(),
    members: [],
    play: null,
  };
}

export function joinLobby(
  match: StoredMatch,
  member: NewMember,
  settings: MatchSettings,
): StoredMatch {
  requireLobby(match);
  requireSeatLeft(match, settings);
  return { ...match, members: [...match.members, { ...member, pick: null }] };
}

export function leaveLobby(match: StoredMatch, playerId: PlayerId): StoredMatch {
  requireLobby(match);
  requireMember(match, playerId);
  return {
    ...match,
    members: match.members.filter(
      (member): boolean => member.playerId !== playerId,
    ),
  };
}

/** Picks are secret and can change until the match starts; a new pick clears ready. */
export function pickCommander(
  match: StoredMatch,
  playerId: PlayerId,
  commanderId: string,
  settings: MatchSettings,
): StoredMatch {
  requireLobby(match);
  requireKnownCommander(commanderId, settings);
  return updateMember(
    match,
    playerId,
    (member): LobbyMember => ({ ...member, pick: { commanderId, ready: false } }),
  );
}

/**
 * Ready or not. When the last player presses ready, the match starts: seats are drawn from the new match
 * seed, every pick is revealed at once, and the calendar is set from this moment.
 */
export function setReady(
  match: StoredMatch,
  playerId: PlayerId,
  ready: boolean,
  start: MatchStart,
  settings: MatchSettings,
): StoredMatch {
  requireLobby(match);
  return startIfEveryoneReady(
    updateMember(match, playerId, (member): LobbyMember => withReady(member, ready)),
    start,
    settings,
  );
}

function withReady(member: LobbyMember, ready: boolean): LobbyMember {
  if (member.pick === null) {
    throw domainError('lobby.noCommander', 'Pick a commander before getting ready');
  }
  return { ...member, pick: { ...member.pick, ready } };
}

function startIfEveryoneReady(
  match: StoredMatch,
  start: MatchStart,
  settings: MatchSettings,
): StoredMatch {
  const readyMembers = match.members.filter(isReadyMember);
  return canStart(match, readyMembers, settings)
    ? startMatch(match, readyMembers, start, settings)
    : match;
}

function canStart(
  match: StoredMatch,
  readyMembers: readonly ReadyMember[],
  settings: MatchSettings,
): boolean {
  return (
    readyMembers.length === match.members.length &&
    readyMembers.length >= settings.lobby.minimumPlayers
  );
}

function startMatch(
  match: StoredMatch,
  readyMembers: readonly ReadyMember[],
  start: MatchStart,
  settings: MatchSettings,
): StoredMatch {
  const matchSeed = start.drawMatchSeed();
  const seating = drawSeating(
    readyMembers.map(
      (member): MatchEntrant => ({
        playerId: member.playerId,
        commanderId: member.pick.commanderId,
      }),
    ),
    matchSeed,
  );
  return {
    ...match,
    play: {
      startedAt: start.now.toISOString(),
      calendar: planMatchCalendar(
        start.now,
        match.timeZone,
        settings.timing,
        settings.config.schedule,
      ),
      state: createInitialMatchState(settings.config, seating, matchSeed),
      replayLog: [],
      spyLog: [],
      orders: [],
    },
  };
}

function updateMember(
  match: StoredMatch,
  playerId: PlayerId,
  change: (member: LobbyMember) => LobbyMember,
): StoredMatch {
  requireMember(match, playerId);
  return {
    ...match,
    members: match.members.map(
      (member): LobbyMember =>
        member.playerId === playerId ? change(member) : member,
    ),
  };
}

function requireLobby(match: StoredMatch): void {
  if (match.play !== null) {
    throw domainError('lobby.started', 'The match has already started');
  }
}

function requireSeatLeft(match: StoredMatch, settings: MatchSettings): void {
  if (match.members.length >= maximumPlayers(settings)) {
    throw domainError('lobby.full', 'Every seat is taken');
  }
}

function requireMember(match: StoredMatch, playerId: PlayerId): void {
  if (!match.members.some((member): boolean => member.playerId === playerId)) {
    throw domainError('auth.unknownToken', `${playerId} is not in this match`);
  }
}

function requireKnownCommander(
  commanderId: string,
  settings: MatchSettings,
): void {
  if (
    !settings.config.commanders.some(
      (commander): boolean => commander.id === commanderId,
    )
  ) {
    throw domainError(
      'lobby.unknownCommander',
      `Unknown commander ${commanderId}`,
    );
  }
}
