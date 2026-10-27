import { TestBed } from '@angular/core/testing';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { normalise, query, queryAll, textOf } from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { HonoursTab } from './honours-tab';

async function renderHonours(
  dayIndex: number,
  change: (
    match: ReturnType<typeof weekMatch>,
  ) => ReturnType<typeof weekMatch> = (match): ReturnType<typeof weekMatch> =>
    match,
): Promise<Awaited<ReturnType<typeof render<HonoursTab>>>> {
  const match = change(weekMatch(dayIndex));
  return render(HonoursTab, {
    view: match.view,
    roster: rosterOf(match, TestBed.inject(Translator)),
  });
}

describe('HonoursTab', () => {
  it('lists the commanders with what everyone knows about them', async () => {
    const fixture = await renderHonours(3);
    const players = queryAll(fixture, '.player').map((player) =>
      normalise(player.textContent),
    );
    expect(players[0]).toBe(
      'Seat 1 · Ana (you) · Napoleon 6 points Ability ready',
    );
    expect(query<HTMLElement>(fixture, '.player').style.borderLeftColor).toBe(
      'var(--seat-1)',
    );
  });

  it('shows upgrades, used abilities and eliminations', async () => {
    const fixture = await renderHonours(3, (match) => ({
      ...match,
      view: {
        ...match.view,
        players: match.view.players.map((player, index) =>
          index === 1
            ? {
                ...player,
                upgrades: ['lancers'],
                abilityUsed: true,
                eliminated: true,
              }
            : player,
        ),
      },
    }));
    const players = queryAll(fixture, '.player').map((player) =>
      normalise(player.textContent),
    );
    expect(players[1]).toBe(
      'Seat 2 · Bo · Wellington 6 points Ability used · Eliminated · Lancers',
    );
  });

  it('shows each honour’s race with every player’s number', async () => {
    const fixture = await renderHonours(3);
    const honours = queryAll(fixture, '.honour').map((honour) =>
      normalise(honour.textContent),
    );
    expect(honours.length).toBeGreaterThan(0);
    expect(textOf(fixture)).toMatch(/leading|Nobody would earn it yet/);
    expect(queryAll(fixture, '.standings tr').length).toBe(honours.length * 4);
  });

  it('marks players who cannot earn an honour', async () => {
    const fixture = await renderHonours(1, (match) => ({
      ...match,
      view: {
        ...match.view,
        honours: match.view.honours.map((honour) => ({
          ...honour,
          leaderIds: [],
          entries: honour.entries.map((entry) => ({
            ...entry,
            eligible: false,
          })),
        })),
      },
    }));
    expect(textOf(fixture)).toContain('(not eligible)');
    expect(textOf(fixture)).toContain('Nobody would earn it yet');
  });

  it('says when no honours are in play', async () => {
    const fixture = await renderHonours(0, (match) => ({
      ...match,
      view: { ...match.view, honours: [] },
    }));
    expect(textOf(fixture)).toContain('No honours are in play.');
  });

  it('shows the final score once the week is over', async () => {
    const fixture = await renderHonours(5);
    expect(textOf(fixture)).toContain('Final score');
    expect(query(fixture, '.final__verdict').textContent).toContain(
      'wins the campaign',
    );
    const rows = queryAll(fixture, '.scores tbody tr').map((row) =>
      [...row.children].map((cell) => normalise(cell.textContent)),
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]?.[0]).toBe('1');
  });

  it('shows a shared victory and honours nobody earned', async () => {
    const fixture = await renderHonours(5, (match) => {
      const score = match.view.finalScore;
      if (score === null) {
        throw new Error('The week should be scored');
      }
      return {
        ...match,
        view: {
          ...match.view,
          finalScore: {
            ...score,
            winnerIds: score.players
              .slice(0, 2)
              .map((player) => player.playerId),
            honours: score.honours.map((honour) => ({
              ...honour,
              winnerIds: [],
            })),
          },
        },
      };
    });
    expect(query(fixture, '.final__verdict').textContent).toContain(
      'Shared victory:',
    );
    expect(textOf(fixture)).toContain('Not awarded');
  });

  it('names who earned each honour', async () => {
    const fixture = await renderHonours(5);
    expect(textOf(fixture)).toContain('Awarded to');
  });
});
