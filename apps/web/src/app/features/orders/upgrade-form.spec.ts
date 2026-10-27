import type { BuyUpgradeOrder } from '@lunch-campaign/engine';
import { buttonNamed, query, queryAll, textOf } from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { setUpWebTest } from '../../../testing/test-providers';
import { UpgradeForm, upgradesOnOffer } from './upgrade-form';

describe('upgradesOnOffer', () => {
  it('leaves out upgrades you own or have already ordered', () => {
    const view = weekMatch(0).view;
    const owning = { ...view, me: { ...view.me, upgrades: ['lancers'] } };
    expect(
      upgradesOnOffer(owning, [
        { kind: 'recruit', unitType: 'line', count: 1 },
        { kind: 'buyUpgrade', upgradeId: 'bayonet-drill' },
      ]),
    ).toEqual(['orderly-retreat']);
  });
});

describe('UpgradeForm', () => {
  it('buys the upgrade chosen', async () => {
    setUpWebTest();
    const fixture = await render(UpgradeForm, {
      view: weekMatch(0).view,
      draft: [],
    });
    const orders: BuyUpgradeOrder[] = [];
    fixture.componentInstance.add.subscribe((order) => orders.push(order));
    expect(textOf(fixture)).toContain('Upgrade · 6 supply');
    expect(
      queryAll(fixture, '.upgrade__name').map((name) =>
        name.textContent?.trim(),
      ),
    ).toEqual(['Orderly Retreat', 'Bayonet Drill', 'Lancers']);
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    query<HTMLInputElement>(fixture, 'input[value=lancers]').dispatchEvent(
      new Event('change'),
    );
    await fixture.whenStable();
    expect(
      query<HTMLInputElement>(fixture, 'input[value=lancers]').checked,
    ).toBe(true);
    buttonNamed(fixture, 'Add').click();
    expect(orders).toEqual([{ kind: 'buyUpgrade', upgradeId: 'lancers' }]);
  });

  it('adds nothing when the form is submitted before a choice', async () => {
    setUpWebTest();
    const fixture = await render(UpgradeForm, {
      view: weekMatch(0).view,
      draft: [],
    });
    const orders: BuyUpgradeOrder[] = [];
    fixture.componentInstance.add.subscribe((order) => orders.push(order));
    query(fixture, 'form').dispatchEvent(new Event('submit'));
    expect(orders).toEqual([]);
  });

  it('says so when there is nothing left to buy', async () => {
    setUpWebTest();
    const view = weekMatch(0).view;
    const fixture = await render(UpgradeForm, {
      view: {
        ...view,
        me: { ...view.me, upgrades: view.orderRules.upgradeIds },
      },
      draft: [],
    });
    expect(textOf(fixture)).toContain('You own every upgrade');
  });
});
