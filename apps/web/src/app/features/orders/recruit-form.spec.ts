import type { RecruitOrder } from '@lunch-campaign/engine';
import {
  buttonNamed,
  choose,
  enter,
  query,
  textOf,
} from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { setUpWebTest } from '../../../testing/test-providers';
import { RecruitForm } from './recruit-form';

describe('RecruitForm', () => {
  it('prices the recruits and adds the order', async () => {
    setUpWebTest();
    const fixture = await render(RecruitForm, { view: weekMatch(0).view });
    const orders: RecruitOrder[] = [];
    fixture.componentInstance.add.subscribe((order) => orders.push(order));
    expect(textOf(fixture)).toContain('Costs 2 supply');
    choose(
      query<HTMLSelectElement>(fixture, '#recruit-type'),
      'Cavalry · 3 supply',
    );
    enter(query<HTMLInputElement>(fixture, '#recruit-count'), '2');
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Costs 6 supply');
    buttonNamed(fixture, 'Add').click();
    expect(orders).toEqual([
      { kind: 'recruit', unitType: 'cavalry', count: 2 },
    ]);
  });

  it('adds nothing for zero recruits', async () => {
    setUpWebTest();
    const fixture = await render(RecruitForm, { view: weekMatch(0).view });
    enter(query<HTMLInputElement>(fixture, '#recruit-count'), '0');
    await fixture.whenStable();
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
  });
});
