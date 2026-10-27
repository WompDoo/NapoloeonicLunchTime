import { setUpWebTest } from '../../../testing/test-providers';
import { textOf } from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { DayHeader } from './day-header';

describe('DayHeader', () => {
  it('shows the day, its deadline, your supply, spies and the event in play', async () => {
    setUpWebTest();
    const fixture = await render(DayHeader, { match: weekMatch(2) });
    const text = textOf(fixture);
    expect(text).toContain('Day 3: Wednesday');
    expect(text).toContain('Orders close 23:00 GMT+2');
    expect(text).toContain('A spy costs 2 supply');
    expect(text).toContain(
      "Typhus: Each player's largest army loses a fifth of its units tonight.",
    );
  });

  it('says when no event is in play and when spies are closed', async () => {
    setUpWebTest();
    const match = weekMatch(1);
    const fixture = await render(DayHeader, {
      match: { ...match, view: { ...match.view, spiesAvailable: false } },
    });
    expect(textOf(fixture)).toContain('No event today');
    expect(textOf(fixture)).toContain('No spies today');
  });

  it('says when the night resolves after the deadline', async () => {
    setUpWebTest();
    const fixture = await render(DayHeader, {
      match: { ...weekMatch(1), openDay: null },
    });
    expect(textOf(fixture)).toContain(
      'Orders are closed. The night resolves at 02:00 GMT+2.',
    );
  });

  it('has no day title once the campaign is over', async () => {
    setUpWebTest();
    const fixture = await render(DayHeader, { match: weekMatch(5) });
    expect(textOf(fixture)).toContain('The campaign is over.');
    expect(textOf(fixture)).not.toContain('Day ');
  });
});
