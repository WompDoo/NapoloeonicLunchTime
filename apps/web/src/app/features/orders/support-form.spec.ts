import type { SupportOrder } from '@lunch-campaign/engine';
import { NO_UNITS } from '@lunch-campaign/engine';
import {
  buttonNamed,
  choose,
  enter,
  optionLabels,
  query,
  textOf,
} from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { setUpWebTest } from '../../../testing/test-providers';
import { SupportForm } from './support-form';

describe('SupportForm', () => {
  it('aims the guns of a zone at a neighbour', async () => {
    setUpWebTest();
    const fixture = await render(SupportForm, { view: weekMatch(0).view });
    const orders: SupportOrder[] = [];
    fixture.componentInstance.add.subscribe((order) => orders.push(order));
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    choose(query<HTMLSelectElement>(fixture, '#support-from'), 'A1');
    await fixture.whenStable();
    expect(
      optionLabels(query<HTMLSelectElement>(fixture, '#support-target')),
    ).toEqual(['Choose…', 'A2', 'B1']);
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    choose(query<HTMLSelectElement>(fixture, '#support-target'), 'A2');
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    expect(orders).toEqual([
      { kind: 'support', fromZoneId: 'A1', targetZoneId: 'A2', count: 1 },
    ]);
  });

  it('adds nothing without guns', async () => {
    setUpWebTest();
    const fixture = await render(SupportForm, { view: weekMatch(0).view });
    choose(query<HTMLSelectElement>(fixture, '#support-from'), 'A1');
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#support-target'), 'B1');
    enter(query<HTMLInputElement>(fixture, '#support-count'), '0');
    await fixture.whenStable();
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
  });

  it('adds nothing when the form is submitted incomplete', async () => {
    setUpWebTest();
    const fixture = await render(SupportForm, { view: weekMatch(0).view });
    const orders: SupportOrder[] = [];
    fixture.componentInstance.add.subscribe((order) => orders.push(order));
    query(fixture, 'form').dispatchEvent(new Event('submit'));
    expect(orders).toEqual([]);
  });

  it('says so when no zone of yours has artillery', async () => {
    setUpWebTest();
    const view = weekMatch(0).view;
    const fixture = await render(SupportForm, {
      view: {
        ...view,
        zones: view.zones.map((zone) => ({
          ...zone,
          army: { kind: 'composition', units: NO_UNITS },
        })),
      },
    });
    expect(textOf(fixture)).toContain('None of your zones has artillery.');
  });
});
