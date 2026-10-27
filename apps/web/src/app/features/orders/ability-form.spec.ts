import type { PlayerView } from '@lunch-campaign/contracts';
import type { UseAbilityOrder } from '@lunch-campaign/engine';
import {
  buttonNamed,
  choose,
  enter,
  optionLabels,
  query,
  textOf,
} from '../../../testing/dom';
import { KUTUZOV_PLAYER, weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { setUpWebTest } from '../../../testing/test-providers';
import { AbilityForm } from './ability-form';

async function renderAbility(view: PlayerView): Promise<{
  fixture: Awaited<ReturnType<typeof render<AbilityForm>>>;
  orders: UseAbilityOrder[];
}> {
  const fixture = await render(AbilityForm, { view, draft: [] });
  const orders: UseAbilityOrder[] = [];
  fixture.componentInstance.add.subscribe((order) => orders.push(order));
  return { fixture, orders };
}

describe('AbilityForm', () => {
  it('uses an ability that needs no target', async () => {
    setUpWebTest();
    const { fixture, orders } = await renderAbility(weekMatch(0).view);
    expect(textOf(fixture)).toContain(
      'Grand Battery: All your artillery bombards twice tonight.',
    );
    buttonNamed(fixture, 'Add').click();
    expect(orders).toEqual([{ kind: 'useAbility', target: { kind: 'none' } }]);
  });

  it('aims an ability at a zone of yours', async () => {
    setUpWebTest();
    const { fixture, orders } = await renderAbility(
      weekMatch(1, KUTUZOV_PLAYER).view,
    );
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    choose(query<HTMLSelectElement>(fixture, '#ability-zone'), 'D1');
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    expect(orders).toEqual([
      { kind: 'useAbility', target: { kind: 'ownedZone', zoneId: 'D1' } },
    ]);
  });

  it('sends part of an army to a battle next door', async () => {
    setUpWebTest();
    const view = weekMatch(0).view;
    const { fixture, orders } = await renderAbility({
      ...view,
      orderRules: { ...view.orderRules, abilityTargetKind: 'reinforcement' },
    });
    choose(query<HTMLSelectElement>(fixture, '#ability-from'), 'A1');
    await fixture.whenStable();
    expect(
      optionLabels(query<HTMLSelectElement>(fixture, '#ability-to')),
    ).toEqual(['Choose…', 'A2', 'B1']);
    choose(query<HTMLSelectElement>(fixture, '#ability-to'), 'B1');
    await fixture.whenStable();
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    enter(query<HTMLInputElement>(fixture, '#ability-line'), '2');
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    expect(orders).toEqual([
      {
        kind: 'useAbility',
        target: {
          kind: 'reinforcement',
          fromZoneId: 'A1',
          toZoneId: 'B1',
          units: { line: 2, cavalry: 0, skirmishers: 0, artillery: 0 },
        },
      },
    ]);
  });

  it('needs both ends of a reinforcement, and adds nothing without them', async () => {
    setUpWebTest();
    const view = weekMatch(0).view;
    const { fixture, orders } = await renderAbility({
      ...view,
      orderRules: { ...view.orderRules, abilityTargetKind: 'reinforcement' },
    });
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    query(fixture, 'form').dispatchEvent(new Event('submit'));
    expect(orders).toEqual([]);
  });

  it.each([
    {
      why: 'used',
      change: { abilityUsed: true },
      draft: [],
      says: 'You have used your ability.',
    },
    {
      why: 'already ordered',
      change: {},
      draft: [{ kind: 'useAbility', target: { kind: 'none' } }],
      says: 'Your ability is already in today’s orders.',
    },
  ] as const)(
    'explains when the ability is $why',
    async ({ change, draft, says }) => {
      setUpWebTest();
      const view = weekMatch(0).view;
      const fixture = await render(AbilityForm, {
        view: { ...view, me: { ...view.me, ...change } },
        draft,
      });
      expect(textOf(fixture)).toContain(says);
    },
  );
});
