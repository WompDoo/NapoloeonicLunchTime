import type { MatchDto } from '@lunch-campaign/contracts';
import {
  buttonNamed,
  choose,
  press,
  query,
  queryAll,
  textOf,
  selectedLabel,
  normalise,
} from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { PlayingView } from './playing-view';

describe('PlayingView', () => {
  it('opens on the map while the match runs', async () => {
    setUpWebTest();
    const fixture = await render(PlayingView, { match: weekMatch(0) });
    expect(
      normalise(query(fixture, '[role=tab][aria-selected=true]').textContent),
    ).toBe('Map');
    expect(
      query(fixture, '[role=tabpanel]').getAttribute('aria-labelledby'),
    ).toBe('tab-map');
    expect(textOf(fixture)).toContain('Campaign map');
  });

  it('opens on the honours once the match is over', async () => {
    setUpWebTest();
    const fixture = await render(PlayingView, { match: weekMatch(5) });
    expect(
      normalise(query(fixture, '[role=tab][aria-selected=true]').textContent),
    ).toBe('Honours');
    expect(textOf(fixture)).toContain('Final score');
  });

  it('moves between tabs with the arrow keys, one tab stop at a time', async () => {
    setUpWebTest();
    const fixture = await render(PlayingView, { match: weekMatch(1) });
    const tabs = queryAll<HTMLButtonElement>(fixture, '[role=tab]');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
    const event = press(query(fixture, '#tab-map'), 'ArrowRight');
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(query(fixture, '#tab-orders'));
    expect(textOf(fixture)).toContain("Today's orders");
    press(query(fixture, '#tab-orders'), 'End');
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Honours this week');
    expect(press(query(fixture, '#tab-honours'), 'a').defaultPrevented).toBe(
      false,
    );
  });

  it('opens a tab on click: last night’s story', async () => {
    setUpWebTest();
    const fixture = await render(PlayingView, { match: weekMatch(1) });
    buttonNamed(fixture, 'Last night').click();
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Event 1 of');
  });

  it('plans a move from a zone chosen on the map', async () => {
    setUpWebTest();
    const fixture = await render(PlayingView, { match: weekMatch(0) });
    query<SVGGElement>(fixture, 'g.zone[data-zone-id=A1]').dispatchEvent(
      new MouseEvent('click'),
    );
    await fixture.whenStable();
    buttonNamed(fixture, 'Plan a move from here').click();
    await fixture.whenStable();
    expect(
      normalise(query(fixture, '[role=tab][aria-selected=true]').textContent),
    ).toBe('Orders');
    expect(selectedLabel(query<HTMLSelectElement>(fixture, '#move-from'))).toBe(
      'A1',
    );
  });

  it('passes on saved orders and requests for a refresh', async () => {
    setUpWebTest();
    const fixture = await render(PlayingView, { match: weekMatch(0) });
    const changes: MatchDto[] = [];
    const refreshes: unknown[] = [];
    fixture.componentInstance.changed.subscribe((match) => changes.push(match));
    fixture.componentInstance.refreshNeeded.subscribe((value) =>
      refreshes.push(value),
    );
    query<SVGGElement>(fixture, 'g.zone[data-zone-id=A4]').dispatchEvent(
      new MouseEvent('click'),
    );
    await fixture.whenStable();
    buttonNamed(fixture, /Send a spy/).click();
    httpTesting()
      .expectOne('/api/matches/match-1/spies')
      .flush(weekMatch(0).view.spyReports[0] ?? {});
    await fixture.whenStable();
    expect(refreshes).toHaveLength(1);
    buttonNamed(fixture, 'Orders').click();
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#order-kind'), 'Recruit');
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    await fixture.whenStable();
    buttonNamed(fixture, 'Save orders').click();
    httpTesting().expectOne('/api/matches/match-1/orders').flush(weekMatch(0));
    await fixture.whenStable();
    expect(changes).toHaveLength(1);
  });
});
