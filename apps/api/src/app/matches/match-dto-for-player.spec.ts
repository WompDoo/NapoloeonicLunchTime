import type { LobbyDto, PlayingMatchDto } from '@lunch-campaign/contracts';
import type { Order } from '@lunch-campaign/engine';
import { filterForPlayer } from '@lunch-campaign/player-view';
import {
  lobbyOf,
  MONDAY_MORNING,
  playerAt,
  playOf,
  SETTINGS,
  startedMatch,
} from '../../testing/match-fixtures';
import { pickCommander } from './lobby';
import { matchDtoFor } from './match-dto-for-player';
import { resolveDueNights, submitOrders } from './match-play';

const RECRUIT: Order = { kind: 'recruit', unitType: 'line', count: 1 };

describe('matchDtoFor', () => {
  it('shows a lobby with your own pick and only whether others picked', () => {
    const lobby = pickCommander(
      pickCommander(lobbyOf(2, MONDAY_MORNING), playerAt(0), 'murat', SETTINGS),
      playerAt(1),
      'moore',
      SETTINGS,
    );
    const dto = matchDtoFor(lobby, playerAt(0), MONDAY_MORNING, SETTINGS) as LobbyDto;
    expect(dto).toEqual({
      phase: 'lobby',
      matchId: 'match-1',
      inviteCode: 'invite-1',
      timeZone: 'Europe/Tallinn',
      yourPlayerId: playerAt(0),
      yourCommanderId: 'murat',
      members: [
        { playerId: playerAt(0), name: 'Name of player-a', hasPicked: true, ready: false },
        { playerId: playerAt(1), name: 'Name of player-b', hasPicked: true, ready: false },
      ],
      commanderIds: SETTINGS.config.commanders.map((commander) => commander.id),
      minimumPlayers: 2,
      maximumPlayers: 4,
    });
    expect(JSON.stringify(dto)).not.toContain('moore');
  });

  it('shows no pick before one is made', () => {
    const dto = matchDtoFor(lobbyOf(1, MONDAY_MORNING), playerAt(0), MONDAY_MORNING, SETTINGS);
    expect(dto).toMatchObject({ yourCommanderId: null });
  });

  it('shows a started match as the player view, with only your own orders', () => {
    const match = submitOrders(
      submitOrders(
        startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed'),
        playerAt(0),
        [RECRUIT],
        MONDAY_MORNING,
        SETTINGS,
      ),
      playerAt(1),
      [RECRUIT, RECRUIT],
      MONDAY_MORNING,
      SETTINGS,
    );
    const play = playOf(match);
    const dto = matchDtoFor(match, playerAt(0), MONDAY_MORNING, SETTINGS) as PlayingMatchDto;
    expect(dto).toEqual({
      phase: 'running',
      matchId: 'match-1',
      timeZone: 'Europe/Tallinn',
      roster: [
        { playerId: playerAt(0), name: 'Name of player-a' },
        { playerId: playerAt(1), name: 'Name of player-b' },
      ],
      calendar: play.calendar,
      openDay: play.calendar[0],
      view: filterForPlayer(
        play.state,
        { replayLog: play.replayLog, spyLog: play.spyLog },
        playerAt(0),
        SETTINGS.config,
      ),
      yourOrders: [RECRUIT],
    });
  });

  it('marks a match finished after Friday night', () => {
    const finished = resolveDueNights(
      startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed'),
      new Date('2026-11-07T08:00:00Z'),
      SETTINGS.config,
    );
    expect(
      matchDtoFor(finished, playerAt(1), new Date('2026-11-07T08:00:00Z'), SETTINGS),
    ).toMatchObject({ phase: 'finished', openDay: null, yourOrders: [] });
  });
});
