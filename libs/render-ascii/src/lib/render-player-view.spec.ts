import type { MatchScore, PlayerView } from '@lunch-campaign/player-view';
import {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  spiedWeekView,
  toPlayerId,
} from '@lunch-campaign/player-view/testing';
import { renderPlayerView } from './render-player-view';

const WEDNESDAY = spiedWeekView(2, KUTUZOV_PLAYER);

function section(view: PlayerView, title: string): readonly string[] {
  const lines = renderPlayerView(view).split('\n');
  const start = lines.indexOf(title);
  const end = lines.indexOf('', start);
  return lines.slice(start + 1, end);
}

describe('renderPlayerView', () => {
  it('renders a day of the week', () => {
    expect(renderPlayerView(WEDNESDAY)).toMatchSnapshot();
  });

  it('renders the finished match', () => {
    expect(renderPlayerView(spiedWeekView(5, MURAT_PLAYER))).toMatchSnapshot();
  });

  it('says so on Monday, before any night or honour race', () => {
    const monday = spiedWeekView(0, NAPOLEON_PLAYER);
    expect(section(monday, 'LAST NIGHT')).toEqual(['No night resolved yet.']);
    expect(section(monday, 'HONOURS')).toEqual([
      'last-stand (3 pts): not contested yet',
      'blitz (3 pts): not contested yet',
      'iron-discipline (3 pts): not contested yet',
    ]);
  });

  it('marks fog, upgrades, used abilities and eliminations', () => {
    const view: PlayerView = {
      ...WEDNESDAY,
      spiesAvailable: false,
      unitCountsVisible: false,
      activeEventIds: ['fog'],
      players: WEDNESDAY.players.map((player) =>
        player.playerId === MURAT_PLAYER
          ? {
              ...player,
              upgrades: ['squares', 'horse-artillery'],
              abilityUsed: true,
              eliminated: true,
            }
          : player,
      ),
      honours: [],
    };
    const text = renderPlayerView(view);
    expect(text).toContain('Supply: 12. No spies today.\nIn play: fog.');
    expect(text).toContain('? = hidden by fog today.');
    expect(section(view, 'PLAYERS')).toContain(
      'P4  murat-player          murat       0 pts  ability used   squares, horse-artillery  eliminated',
    );
    expect(section(view, 'HONOURS')).toEqual(['No honours drawn.']);
  });

  it('names honours nobody would earn yet and those not eligible', () => {
    const view: PlayerView = {
      ...WEDNESDAY,
      honours: [
        {
          honourId: 'iron-discipline',
          points: 3,
          leaderIds: [],
          entries: [{ playerId: NAPOLEON_PLAYER, value: 0, eligible: false }],
        },
      ],
    };
    expect(section(view, 'HONOURS')).toEqual([
      'iron-discipline (3 pts): nobody would earn it yet',
      '  napoleon-player 0 (not eligible)',
    ]);
  });

  it('announces a shared victory and honours nobody won', () => {
    const score: MatchScore = {
      honours: [{ honourId: 'spymaster', points: 3, winnerIds: [] }],
      players: [
        {
          playerId: toPlayerId('a'),
          cityPoints: 9,
          honourPoints: 0,
          total: 9,
          citiesHeld: 1,
          unitsLost: 0,
          rank: 1,
        },
        {
          playerId: toPlayerId('b'),
          cityPoints: 9,
          honourPoints: 0,
          total: 9,
          citiesHeld: 1,
          unitsLost: 0,
          rank: 1,
        },
      ],
      winnerIds: [toPlayerId('a'), toPlayerId('b')],
    };
    expect(section({ ...WEDNESDAY, finalScore: score }, 'FINAL SCORE')).toEqual(
      [
        'Shared victory: a and b',
        '1.  a  9 pts  9 from cities  0 from honours',
        '1.  b  9 pts  9 from cities  0 from honours',
        'spymaster: nobody',
      ],
    );
  });
});
