import { TestBed } from '@angular/core/testing';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { buttonNamed, query, queryAll, textOf } from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { ReplayViewer } from './replay-viewer';

async function renderReplay(
  dayIndex: number,
): Promise<Awaited<ReturnType<typeof render<ReplayViewer>>>> {
  const match = weekMatch(dayIndex);
  return render(ReplayViewer, {
    view: match.view,
    roster: rosterOf(match, TestBed.inject(Translator)),
  });
}

describe('ReplayViewer', () => {
  it('says when no night has been resolved yet', async () => {
    const fixture = await renderReplay(0);
    expect(textOf(fixture)).toContain('No night has been resolved yet.');
  });

  it('steps through the night, showing each step’s zones on the map', async () => {
    const fixture = await renderReplay(3);
    expect(textOf(fixture)).toContain('Event 1 of 18');
    expect(query(fixture, '.replay__entry').textContent).toContain(
      'Bo moved 4 units: B3 → B2',
    );
    expect(queryAll(fixture, '.zone__highlight')).toHaveLength(2);
    expect(buttonNamed(fixture, 'Previous').disabled).toBe(true);
    Array.from({ length: 5 }).forEach(() => {
      buttonNamed(fixture, 'Next').click();
    });
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Event 6 of 18');
    expect(textOf(fixture)).toContain('strength 7.5');
    buttonNamed(fixture, 'Previous').click();
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Event 5 of 18');
  });

  it('stops at the last step', async () => {
    const fixture = await renderReplay(1);
    const total = Number(/of (\d+)/.exec(textOf(fixture))?.[1]);
    Array.from({ length: total + 2 }).forEach(() => {
      buttonNamed(fixture, 'Next').click();
    });
    await fixture.whenStable();
    expect(textOf(fixture)).toContain(`Event ${total} of ${total}`);
    expect(buttonNamed(fixture, 'Next').disabled).toBe(true);
  });

  it('shows every event at once on request', async () => {
    const fixture = await renderReplay(3);
    buttonNamed(fixture, 'Show every event').click();
    await fixture.whenStable();
    expect(queryAll(fixture, 'ol .replay__entry')).toHaveLength(18);
    expect(textOf(fixture)).toContain(
      'Bo (attacking): 1 cavalry, 1 skirmisher → no units, strength 2.5',
    );
    expect(
      buttonNamed(fixture, 'Show every event').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('starts again at the first step when a new night arrives, not on every refresh', async () => {
    const fixture = await renderReplay(3);
    buttonNamed(fixture, 'Next').click();
    await fixture.whenStable();
    fixture.componentRef.setInput('view', { ...weekMatch(3).view });
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Event 2 of 18');
    fixture.componentRef.setInput('view', weekMatch(4).view);
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Event 1 of');
  });
});
