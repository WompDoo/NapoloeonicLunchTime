import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type { MatchState } from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  playSpiedWeek,
  spiedWeekView,
  WELLINGTON_PLAYER,
} from '../testing/spied-week';
import { honourStandings } from './honour-standings';

describe('honourStandings', () => {
  it('names nobody before the first night', () => {
    expect(spiedWeekView(0, NAPOLEON_PLAYER).honours).toEqual([
      { honourId: 'last-stand', points: 3, leaderIds: [], entries: [] },
      { honourId: 'blitz', points: 3, leaderIds: [], entries: [] },
      { honourId: 'iron-discipline', points: 3, leaderIds: [], entries: [] },
    ]);
  });

  it('shows everyone’s standing after Wednesday night', () => {
    const lastStand = spiedWeekView(3, WELLINGTON_PLAYER).honours[0];
    expect(lastStand).toEqual({
      honourId: 'last-stand',
      points: 3,
      leaderIds: [NAPOLEON_PLAYER],
      entries: [
        { playerId: NAPOLEON_PLAYER, value: 1, eligible: true },
        { playerId: WELLINGTON_PLAYER, value: 0, eligible: true },
        { playerId: KUTUZOV_PLAYER, value: 0, eligible: true },
        { playerId: MURAT_PLAYER, value: 0, eligible: true },
      ],
    });
  });

  it('is the same for every viewer', () => {
    const viewers = [
      NAPOLEON_PLAYER,
      WELLINGTON_PLAYER,
      KUTUZOV_PLAYER,
      MURAT_PLAYER,
    ];
    const standings = viewers.map((viewer) => spiedWeekView(4, viewer).honours);
    standings.forEach((standing) => {
      expect(standing).toEqual(standings[0]);
    });
  });

  it('leads to the honours awarded after Friday', () => {
    const view = spiedWeekView(5, MURAT_PLAYER);
    const leaders = [
      [NAPOLEON_PLAYER],
      [MURAT_PLAYER],
      [NAPOLEON_PLAYER, KUTUZOV_PLAYER],
    ];
    expect(view.honours.map((honour) => honour.leaderIds)).toEqual(leaders);
    expect(view.finalScore).toMatchObject({
      honours: leaders.map((winnerIds) => ({ winnerIds })),
    });
  });

  it('refuses honours missing from the match config', () => {
    const friday = requirePresent(playSpiedWeek()[4], 'Friday');
    const state: MatchState = { ...friday.state, honourIds: ['last-stand'] };
    const config = {
      ...DEFAULT_MATCH_CONFIG,
      honours: { ...DEFAULT_MATCH_CONFIG.honours, pool: [] },
    };
    expect(() => honourStandings(state, friday.logs, config)).toThrow(
      'honour last-stand in the match config',
    );
  });
});
