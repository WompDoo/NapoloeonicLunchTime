import { findZone, toPlayerId, toZoneId } from '@lunch-campaign/engine';
import {
  emptyLobby,
  lobbyOf,
  MONDAY_MORNING,
  playerAt,
  playOf,
  SETTINGS,
  startedMatch,
} from '../../testing/match-fixtures';
import { DomainError } from '../errors/domain-error';
import {
  joinLobby,
  leaveLobby,
  openLobby,
  pickCommander,
  setReady,
} from './lobby';
import type { StoredMatch } from './stored-match';

const START = { now: MONDAY_MORNING, drawMatchSeed: (): string => 'seed' };

function errorCodeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as DomainError).code;
  }
  throw new Error('Expected a domain error');
}

describe('lobby', () => {
  it('opens an empty lobby in a known time zone', () => {
    expect(emptyLobby(MONDAY_MORNING)).toEqual({
      matchId: 'match-1',
      inviteCode: 'invite-1',
      timeZone: 'Europe/Tallinn',
      createdAt: '2026-11-02T07:00:00.000Z',
      members: [],
      play: null,
    });
    expect(
      errorCodeOf(() =>
        openLobby({
          matchId: 'm',
          inviteCode: 'i',
          timeZone: 'Atlantis/Capital',
          now: MONDAY_MORNING,
        }),
      ),
    ).toBe('lobby.unknownTimeZone');
  });

  it('takes one player per starting capital', () => {
    const full = lobbyOf(4, MONDAY_MORNING);
    expect(full.members.map((member) => member.pick)).toEqual([null, null, null, null]);
    expect(
      errorCodeOf(() =>
        joinLobby(full, { playerId: toPlayerId('player-e'), name: 'E' }, SETTINGS),
      ),
    ).toBe('lobby.full');
  });

  it('keeps picks changeable, and a new pick clears ready', () => {
    const lobby = lobbyOf(3, MONDAY_MORNING);
    const ready = setReady(
      pickCommander(lobby, playerAt(0), 'murat', SETTINGS),
      playerAt(0),
      true,
      START,
      SETTINGS,
    );
    expect(ready.members[0]?.pick).toEqual({ commanderId: 'murat', ready: true });
    expect(
      pickCommander(ready, playerAt(0), 'moore', SETTINGS).members[0]?.pick,
    ).toEqual({ commanderId: 'moore', ready: false });
  });

  it.each([
    {
      name: 'an unknown commander',
      act: (match: StoredMatch): StoredMatch =>
        pickCommander(match, playerAt(0), 'ney', SETTINGS),
      code: 'lobby.unknownCommander',
    },
    {
      name: 'ready without a pick',
      act: (match: StoredMatch): StoredMatch =>
        setReady(match, playerAt(0), true, START, SETTINGS),
      code: 'lobby.noCommander',
    },
    {
      name: 'someone who is not in the lobby',
      act: (match: StoredMatch): StoredMatch =>
        leaveLobby(match, toPlayerId('stranger')),
      code: 'auth.unknownToken',
    },
  ])('refuses $name', ({ act, code }) => {
    expect(errorCodeOf(() => act(lobbyOf(2, MONDAY_MORNING)))).toBe(code);
  });

  it('lets players leave before the start', () => {
    expect(
      leaveLobby(lobbyOf(3, MONDAY_MORNING), playerAt(1)).members.map(
        (member) => member.playerId,
      ),
    ).toEqual([playerAt(0), playerAt(2)]);
  });

  describe('starting', () => {
    it('waits for the minimum number of players', () => {
      const alone = setReady(
        pickCommander(lobbyOf(1, MONDAY_MORNING), playerAt(0), 'murat', SETTINGS),
        playerAt(0),
        true,
        START,
        SETTINGS,
      );
      expect(alone.play).toBeNull();
    });

    it('waits for everyone, and draws the seed only when it starts', () => {
      const draws: string[] = [];
      const start = {
        now: MONDAY_MORNING,
        drawMatchSeed: (): string => {
          draws.push('drawn');
          return 'seed';
        },
      };
      const picked = ['murat', 'moore'].reduce(
        (match, commanderId, index) =>
          pickCommander(match, playerAt(index), commanderId, SETTINGS),
        lobbyOf(2, MONDAY_MORNING),
      );
      const oneReady = setReady(picked, playerAt(0), true, start, SETTINGS);
      expect(oneReady.play).toBeNull();
      expect(draws).toEqual([]);
      expect(setReady(oneReady, playerAt(1), true, start, SETTINGS).play).not.toBeNull();
      expect(draws).toEqual(['drawn']);
    });

    it('does not start while someone has un-readied', () => {
      const picked = ['murat', 'moore'].reduce(
        (match, commanderId, index) =>
          pickCommander(match, playerAt(index), commanderId, SETTINGS),
        lobbyOf(2, MONDAY_MORNING),
      );
      const unready = setReady(
        setReady(picked, playerAt(0), true, START, SETTINGS),
        playerAt(0),
        false,
        START,
        SETTINGS,
      );
      expect(setReady(unready, playerAt(1), true, START, SETTINGS).play).toBeNull();
    });

    it('draws seats, reveals picks and leaves unused capitals neutral', () => {
      const play = playOf(startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed'));
      expect(play.state.players.map((player) => player.seat)).toEqual([1, 2]);
      expect(
        play.state.players
          .map((player) => [player.playerId, player.commanderId])
          .toSorted(),
      ).toEqual([
        [playerAt(0), 'murat'],
        [playerAt(1), 'moore'],
      ]);
      ['D1', 'D4'].forEach((capital) => {
        expect(findZone(play.state, toZoneId(capital))).toEqual({
          zoneId: capital,
          ownerId: null,
          armies: [],
        });
      });
      expect(play.calendar.map((day) => day.date)).toEqual([
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
      ]);
      expect(play).toMatchObject({
        startedAt: '2026-11-02T07:00:00.000Z',
        replayLog: [],
        spyLog: [],
        orders: [],
      });
    });

    it('closes the lobby once started', () => {
      const started = startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed');
      expect(
        errorCodeOf(() =>
          joinLobby(started, { playerId: toPlayerId('late'), name: 'Late' }, SETTINGS),
        ),
      ).toBe('lobby.started');
    });
  });
});
