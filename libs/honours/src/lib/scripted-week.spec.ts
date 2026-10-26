import type { HonourId } from '@lunch-campaign/content';
import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import { isMatchFinished } from '@lunch-campaign/engine';
import {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  playWeek,
  WELLINGTON_PLAYER,
} from '../testing/scripted-week';
import { createHonourContext } from './honour-context';
import { scoreMatch, awardHonour } from './score-match';
import { playerIds } from './log-queries';

describe('a scripted full week', () => {
  const week = playWeek();
  const record = { replayLog: week.replayLog, spyLog: [] };

  it('plays all five nights and draws its honours from the seed', () => {
    expect(isMatchFinished(week.end, DEFAULT_MATCH_CONFIG)).toBe(true);
    expect(week.start.honourIds).toEqual([
      'last-stand',
      'blitz',
      'iron-discipline',
    ]);
  });

  it('produces the expected final scores, honours and winner', () => {
    const score = scoreMatch(
      record,
      week.start.honourIds,
      DEFAULT_MATCH_CONFIG,
    );
    expect(score.honours).toEqual([
      // Napoleon won B2 as defender on Wednesday (in combat) and Friday (by bombardment).
      { honourId: 'last-stand', points: 3, winnerIds: [NAPOLEON_PLAYER] },
      // Murat took C2, C4 and D2 on Friday; nobody else ever took more than 2 in a night.
      { honourId: 'blitz', points: 3, winnerIds: [MURAT_PLAYER] },
      // Napoleon lost 2 (Wednesday's B2); Kutuzov lost 2 (Wednesday's C3), his retreats saving the rest.
      {
        honourId: 'iron-discipline',
        points: 3,
        winnerIds: [NAPOLEON_PLAYER, KUTUZOV_PLAYER],
      },
    ]);
    expect(score.players).toEqual([
      // 24 each: Murat holds 3 cities at the end (D4, C3, C2), Napoleon 2 (A1, B2).
      {
        playerId: MURAT_PLAYER,
        cityPoints: 21,
        honourPoints: 3,
        total: 24,
        citiesHeld: 3,
        unitsLost: 3,
        rank: 1,
      },
      {
        playerId: NAPOLEON_PLAYER,
        cityPoints: 18,
        honourPoints: 6,
        total: 24,
        citiesHeld: 2,
        unitsLost: 2,
        rank: 2,
      },
      // 18 each: Wellington holds 2 cities (A4, B3), Kutuzov 1 (D1).
      {
        playerId: WELLINGTON_PLAYER,
        cityPoints: 18,
        honourPoints: 0,
        total: 18,
        citiesHeld: 2,
        unitsLost: 5,
        rank: 3,
      },
      {
        playerId: KUTUZOV_PLAYER,
        cityPoints: 15,
        honourPoints: 3,
        total: 18,
        citiesHeld: 1,
        unitsLost: 2,
        rank: 4,
      },
    ]);
    expect(score.winnerIds).toEqual([MURAT_PLAYER]);
  });

  it('agrees with the match state on city points', () => {
    const score = scoreMatch(record, [], DEFAULT_MATCH_CONFIG);
    expect(
      Object.fromEntries(
        score.players.map((player) => [player.playerId, player.cityPoints]),
      ),
    ).toEqual(
      Object.fromEntries(
        week.end.players.map((player) => [player.playerId, player.score]),
      ),
    );
  });

  it.each<{ honourId: HonourId; winners: readonly string[] }>([
    { honourId: 'grande-armee', winners: [MURAT_PLAYER] },
    { honourId: 'empire', winners: [MURAT_PLAYER] },
    { honourId: 'butchers-bill', winners: [NAPOLEON_PLAYER] },
    { honourId: 'iron-discipline', winners: [NAPOLEON_PLAYER, KUTUZOV_PLAYER] },
    { honourId: 'the-fox', winners: [] },
    { honourId: 'last-stand', winners: [NAPOLEON_PLAYER] },
    { honourId: 'spymaster', winners: [] },
    { honourId: 'thunder-of-guns', winners: [NAPOLEON_PLAYER] },
    { honourId: 'saddle-up', winners: [MURAT_PLAYER] },
    { honourId: 'rearguard', winners: [KUTUZOV_PLAYER] },
    { honourId: 'forager', winners: [NAPOLEON_PLAYER, WELLINGTON_PLAYER] },
    { honourId: 'blitz', winners: [MURAT_PLAYER] },
  ])(
    'would award $honourId to $winners on this week’s log',
    ({ honourId, winners }) => {
      const award = awardHonour(
        createHonourContext(record),
        honourId,
        3,
        playerIds(record),
      );
      expect(award.winnerIds).toEqual(winners);
    },
  );
});
