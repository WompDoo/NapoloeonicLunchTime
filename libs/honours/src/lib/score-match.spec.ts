import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type { MatchConfig, ReplayEvent } from '@lunch-campaign/engine';
import { EngineContractError } from '@lunch-campaign/engine';
import {
  field,
  formed,
  P1,
  P2,
  P3,
  points,
  record,
  resolved,
  standings,
  supply,
} from '../testing/log-builder';
import { scoreMatch } from './score-match';

function finalNight(rows: Parameters<typeof standings>[1]): ReplayEvent {
  return standings(5, rows);
}

describe('scoreMatch', () => {
  describe('honours', () => {
    it('awards the full points to every player tied for the best count', () => {
      const score = scoreMatch(
        record([
          supply(1, P1, 4),
          supply(1, P2, 4),
          supply(1, P3, 1),
          finalNight([{ playerId: P1 }, { playerId: P2 }, { playerId: P3 }]),
        ]),
        ['forager'],
        DEFAULT_MATCH_CONFIG,
      );
      expect(score.honours).toEqual([
        { honourId: 'forager', points: 3, winnerIds: [P1, P2] },
      ]);
    });

    it('awards nobody a "most" honour when the best count is 0', () => {
      const score = scoreMatch(
        record([finalNight([{ playerId: P1 }, { playerId: P2 }])]),
        ['spymaster'],
        DEFAULT_MATCH_CONFIG,
      );
      expect(score.honours[0]?.winnerIds).toEqual([]);
      expect(score.players.map((player) => player.honourPoints)).toEqual([
        0, 0,
      ]);
    });

    it('awards a "fewest" honour among eligible players only, zero included', () => {
      const score = scoreMatch(
        record([
          field(
            1,
            [
              { playerId: P1, units: { line: 3 }, remaining: { line: 3 } },
              { playerId: P2, units: { line: 1 } },
            ],
            P1,
          ),
          finalNight([{ playerId: P1 }, { playerId: P2 }, { playerId: P3 }]),
        ]),
        ['iron-discipline'],
        DEFAULT_MATCH_CONFIG,
      );
      expect(score.honours[0]?.winnerIds).toEqual([P1]);
    });

    it('awards nothing when no player is eligible', () => {
      const score = scoreMatch(
        record([finalNight([{ playerId: P1 }])]),
        ['iron-discipline'],
        DEFAULT_MATCH_CONFIG,
      );
      expect(score.honours[0]?.winnerIds).toEqual([]);
    });

    it('takes each honour’s points from the config', () => {
      const config: MatchConfig = {
        ...DEFAULT_MATCH_CONFIG,
        honours: {
          ...DEFAULT_MATCH_CONFIG.honours,
          pool: [{ id: 'empire', points: 5 }],
        },
      };
      const score = scoreMatch(
        record([finalNight([{ playerId: P1, zonesOwned: 2 }])]),
        ['empire'],
        config,
      );
      expect(score.players[0]).toMatchObject({ honourPoints: 5, total: 5 });
    });

    it('refuses honours it has no query for, or the config does not list', () => {
      const log = record([finalNight([{ playerId: P1 }])]);
      expect(() =>
        scoreMatch(log, ['knighthood'], DEFAULT_MATCH_CONFIG),
      ).toThrow(new EngineContractError('Unknown honour knighthood'));
      const config: MatchConfig = {
        ...DEFAULT_MATCH_CONFIG,
        honours: { ...DEFAULT_MATCH_CONFIG.honours, pool: [] },
      };
      expect(() => scoreMatch(log, ['empire'], config)).toThrow(
        EngineContractError,
      );
    });
  });

  describe('ranking', () => {
    it('adds city points from the log to honour points', () => {
      const score = scoreMatch(
        record([
          points(3, P1, 6),
          points(5, P1, 12),
          points(5, P2, 6),
          finalNight([{ playerId: P1, zonesOwned: 1 }, { playerId: P2 }]),
        ]),
        ['empire'],
        DEFAULT_MATCH_CONFIG,
      );
      expect(score.players[0]).toMatchObject({
        playerId: P1,
        cityPoints: 18,
        honourPoints: 3,
        total: 21,
        rank: 1,
      });
      expect(score.winnerIds).toEqual([P1]);
    });

    it('breaks a tie on total by more cities held at the end', () => {
      const score = scoreMatch(
        record([
          points(5, P1, 6),
          points(5, P2, 6),
          finalNight([
            { playerId: P1, citiesHeld: 1 },
            { playerId: P2, citiesHeld: 2 },
          ]),
        ]),
        [],
        DEFAULT_MATCH_CONFIG,
      );
      expect(
        score.players.map((player) => [player.playerId, player.rank]),
      ).toEqual([
        [P2, 1],
        [P1, 2],
      ]);
    });

    it('then by fewer units lost in battle', () => {
      const score = scoreMatch(
        record([
          formed(2, 'B2', [
            { playerId: P1, units: { line: 4 } },
            { playerId: P2, units: { line: 3 } },
          ]),
          resolved(
            2,
            'B2',
            [
              { playerId: P1, units: { line: 4 }, remaining: { line: 2 } },
              { playerId: P2, units: { line: 3 } },
            ],
            P1,
          ),
          finalNight([{ playerId: P1 }, { playerId: P2 }]),
        ]),
        [],
        DEFAULT_MATCH_CONFIG,
      );
      expect(
        score.players.map((player) => [
          player.playerId,
          player.unitsLost,
          player.rank,
        ]),
      ).toEqual([
        [P1, 2, 1],
        [P2, 3, 2],
      ]);
    });

    it('shares the victory when players are tied on everything', () => {
      const score = scoreMatch(
        record([
          points(5, P1, 3),
          points(5, P3, 3),
          finalNight([{ playerId: P1 }, { playerId: P2 }, { playerId: P3 }]),
        ]),
        [],
        DEFAULT_MATCH_CONFIG,
      );
      expect(score.winnerIds).toEqual([P1, P3]);
      expect(
        score.players.map((player) => [player.playerId, player.rank]),
      ).toEqual([
        [P1, 1],
        [P3, 1],
        [P2, 3],
      ]);
    });
  });
});
