import type {
  LobbyDto,
  LobbyMemberDto,
  MatchDto,
  PlayingMatchDto,
  RosterEntryDto,
} from '@lunch-campaign/contracts';
import type { PlayerId } from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import { filterForPlayer } from '@lunch-campaign/player-view';
import type { MatchSettings } from './match-settings';
import { maximumPlayers } from './match-settings';
import { openDayOf, ordersOf } from './match-play';
import type { LobbyMember, MatchPlay, StoredMatch } from './stored-match';
import { isReadyMember, playPhase } from './stored-match';

/**
 * The only way match data leaves the API. A started match is the player's PlayerView, built by
 * filterForPlayer, plus what is theirs or public anyway: names, the calendar and their own orders.
 */
export function matchDtoFor(
  match: StoredMatch,
  playerId: PlayerId,
  now: Date,
  settings: MatchSettings,
): MatchDto {
  return match.play === null
    ? lobbyDto(match, playerId, settings)
    : playingDto(match, match.play, playerId, now, settings);
}

function lobbyDto(
  match: StoredMatch,
  playerId: PlayerId,
  settings: MatchSettings,
): LobbyDto {
  return {
    phase: 'lobby',
    matchId: match.matchId,
    inviteCode: match.inviteCode,
    timeZone: match.timeZone,
    yourPlayerId: playerId,
    yourCommanderId: pickedCommanderId(memberOf(match, playerId)),
    members: match.members.map(
      (member): LobbyMemberDto => ({
        playerId: member.playerId,
        name: member.name,
        hasPicked: member.pick !== null,
        ready: isReadyMember(member),
      }),
    ),
    commanderIds: settings.config.commanders.map(
      (commander): string => commander.id,
    ),
    minimumPlayers: settings.lobby.minimumPlayers,
    maximumPlayers: maximumPlayers(settings),
  };
}

function playingDto(
  match: StoredMatch,
  play: MatchPlay,
  playerId: PlayerId,
  now: Date,
  settings: MatchSettings,
): PlayingMatchDto {
  return {
    phase: playPhase(play, settings.config),
    matchId: match.matchId,
    timeZone: match.timeZone,
    roster: match.members.map(
      (member): RosterEntryDto => ({
        playerId: member.playerId,
        name: member.name,
      }),
    ),
    calendar: play.calendar,
    openDay: openDayOf(play, now, settings.config),
    view: filterForPlayer(
      play.state,
      { replayLog: play.replayLog, spyLog: play.spyLog },
      playerId,
      settings.config,
    ),
    yourOrders: ordersOf(play, playerId),
  };
}

function memberOf(match: StoredMatch, playerId: PlayerId): LobbyMember {
  return requirePresent(
    match.members.find((member): boolean => member.playerId === playerId),
    `member ${playerId}`,
  );
}

function pickedCommanderId(member: LobbyMember): string | null {
  return member.pick === null ? null : member.pick.commanderId;
}
