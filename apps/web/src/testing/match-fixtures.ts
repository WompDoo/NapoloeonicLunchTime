import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type {
  LobbyDto,
  LobbyMemberDto,
  PlayerView,
  PlayingMatchDto,
  TurnWindowDto,
} from '@lunch-campaign/contracts';
import type { PlayerId } from '@lunch-campaign/engine';
import { requirePresent, toPlayerId } from '@lunch-campaign/engine';
import {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  spiedWeekView,
  WELLINGTON_PLAYER,
} from '@lunch-campaign/player-view/testing';
import type { PlayerSession } from '../app/core/sessions/player-sessions';

export { KUTUZOV_PLAYER, MURAT_PLAYER, NAPOLEON_PLAYER, WELLINGTON_PLAYER };

export const MATCH_ID = 'match-1';
export const TIME_ZONE = 'Europe/Tallinn';

/** What the four scripted players call themselves. */
export const PLAYER_NAMES: Readonly<Record<string, string>> = {
  [NAPOLEON_PLAYER]: 'Ana',
  [WELLINGTON_PLAYER]: 'Bo',
  [KUTUZOV_PLAYER]: 'Cy',
  [MURAT_PLAYER]: 'Di',
};

const WEEK_DATES = [
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
];
const NEXT_DATES = [
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
  '2026-11-07',
];

/** Orders close at 23:00 and nights resolve at 02:00 in Tallinn (UTC+2 in November). */
export const WEEK_CALENDAR: readonly TurnWindowDto[] =
  DEFAULT_MATCH_CONFIG.schedule.map(
    (entry, index): TurnWindowDto => ({
      turnNumber: index + 1,
      dayLabel: entry.label,
      date: requirePresent(WEEK_DATES[index], `date ${index}`),
      deadlineAt: `${requirePresent(WEEK_DATES[index], `date ${index}`)}T21:00:00.000Z`,
      resolvesAt: `${requirePresent(NEXT_DATES[index], `next date ${index}`)}T00:00:00.000Z`,
    }),
  );

export function windowOf(turnNumber: number): TurnWindowDto {
  return requirePresent(
    WEEK_CALENDAR[turnNumber - 1],
    `window of turn ${turnNumber}`,
  );
}

/** A started match around a real view; the day is open unless the match is over. */
export function playingMatch(
  view: PlayerView,
  overrides: Partial<PlayingMatchDto> = {},
): PlayingMatchDto {
  return { ...progressOf(view), ...matchAround(view), ...overrides };
}

function progressOf(
  view: PlayerView,
): Pick<PlayingMatchDto, 'phase' | 'openDay'> {
  return view.finalScore === null
    ? { phase: 'running', openDay: windowOf(view.turnNumber) }
    : { phase: 'finished', openDay: null };
}

function matchAround(
  view: PlayerView,
): Omit<PlayingMatchDto, 'phase' | 'openDay'> {
  return {
    matchId: MATCH_ID,
    timeZone: TIME_ZONE,
    roster: view.players.map((player) => ({
      playerId: player.playerId,
      name: requirePresent(
        PLAYER_NAMES[player.playerId],
        `name of ${player.playerId}`,
      ),
    })),
    calendar: WEEK_CALENDAR,
    view,
    yourOrders: [],
  };
}

/** Day 0 is Monday; 5 is after Friday night. Napoleon's view unless another viewer is named. */
export function weekMatch(
  dayIndex: number,
  viewerId: PlayerId = NAPOLEON_PLAYER,
): PlayingMatchDto {
  return playingMatch(spiedWeekView(dayIndex, viewerId));
}

export const YOU = toPlayerId('player-a');
export const FRIEND = toPlayerId('player-b');

const LOBBY_NAMES: Readonly<Record<string, string>> = {
  [YOU]: 'Ana',
  [FRIEND]: 'Bo',
};

export function member(
  playerId: PlayerId,
  overrides: Partial<LobbyMemberDto> = {},
): LobbyMemberDto {
  return {
    playerId,
    name: requirePresent(LOBBY_NAMES[playerId], `name of ${playerId}`),
    hasPicked: false,
    ready: false,
    ...overrides,
  };
}

export function lobby(overrides: Partial<LobbyDto> = {}): LobbyDto {
  return {
    phase: 'lobby',
    matchId: MATCH_ID,
    inviteCode: 'invite-1',
    timeZone: TIME_ZONE,
    yourPlayerId: YOU,
    yourCommanderId: null,
    members: [member(YOU), member(FRIEND)],
    commanderIds: DEFAULT_MATCH_CONFIG.commanders.map(
      (commander) => commander.id,
    ),
    minimumPlayers: 2,
    maximumPlayers: 4,
    ...overrides,
  };
}

export function session(overrides: Partial<PlayerSession> = {}): PlayerSession {
  return {
    matchId: MATCH_ID,
    playerId: YOU,
    playerToken: 'token-a',
    name: 'Ana',
    ...overrides,
  };
}
