import { TestBed } from '@angular/core/testing';
import type {
  ApiError,
  MatchDto,
  PlayingMatchDto,
} from '@lunch-campaign/contracts';
import type { Order } from '@lunch-campaign/engine';
import { toZoneId } from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import {
  buttonNamed,
  choose,
  enter,
  hasButton,
  query,
  queryAll,
  textOf,
  normalise,
} from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { OrdersPanel, saveStatusOf } from './orders-panel';

const ORDERS_URL = '/api/matches/match-1/orders';
const RECRUIT: Order = { kind: 'recruit', unitType: 'line', count: 1 };
const UPGRADE: Order = { kind: 'buyUpgrade', upgradeId: 'lancers' };

async function renderPanel(match: PlayingMatchDto = weekMatch(0)): Promise<{
  fixture: Awaited<ReturnType<typeof render<OrdersPanel>>>;
  changes: MatchDto[];
}> {
  const fixture = await render(OrdersPanel, {
    match,
    roster: rosterOf(match, TestBed.inject(Translator)),
  });
  const changes: MatchDto[] = [];
  fixture.componentInstance.changed.subscribe((saved) => changes.push(saved));
  return { fixture, changes };
}

function listed(
  fixture: Awaited<ReturnType<typeof render<OrdersPanel>>>,
): readonly string[] {
  return queryAll(fixture, 'li.order span:first-child').map((item) =>
    normalise(item.textContent),
  );
}

async function addRecruit(
  fixture: Awaited<ReturnType<typeof render<OrdersPanel>>>,
): Promise<void> {
  choose(query<HTMLSelectElement>(fixture, '#order-kind'), 'Recruit');
  await fixture.whenStable();
  buttonNamed(fixture, 'Add').click();
  await fixture.whenStable();
}

describe('saveStatusOf', () => {
  it.each([
    { unsaved: true, savedCount: 0, status: 'orders.unsaved' },
    { unsaved: false, savedCount: 2, status: 'orders.saved' },
    { unsaved: false, savedCount: 0, status: null },
  ])(
    'is $status when unsaved is $unsaved with $savedCount saved',
    ({ unsaved, savedCount, status }) => {
      expect(saveStatusOf(unsaved, savedCount)).toBe(status);
    },
  );
});

describe('OrdersPanel', () => {
  it('starts with no orders, the move limit and your supply', async () => {
    setUpWebTest();
    const { fixture } = await renderPanel();
    expect(textOf(fixture)).toContain(
      'No orders yet. Units without orders hold.',
    );
    expect(textOf(fixture)).toContain(
      '0 of 5 moves · 6 supply left after these orders',
    );
    expect(buttonNamed(fixture, 'Save orders').disabled).toBe(true);
  });

  it('builds a draft, counting its cost, and saves it whole', async () => {
    setUpWebTest();
    const { fixture, changes } = await renderPanel();
    await addRecruit(fixture);
    expect(listed(fixture)).toEqual(['1. Recruit 1 line']);
    expect(textOf(fixture)).toContain('4 supply left after these orders');
    expect(textOf(fixture)).toContain('Not saved yet');
    buttonNamed(fixture, 'Save orders').click();
    const request = httpTesting().expectOne(ORDERS_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ orders: [RECRUIT] });
    const saved = { ...weekMatch(0), yourOrders: [RECRUIT] };
    request.flush(saved);
    await fixture.whenStable();
    expect(changes).toEqual([saved]);
    fixture.componentRef.setInput('match', saved);
    await fixture.whenStable();
    expect(textOf(fixture)).toContain(
      'Saved. You can change them until the deadline.',
    );
  });

  it('removes an order from the draft', async () => {
    setUpWebTest();
    const { fixture } = await renderPanel({
      ...weekMatch(0),
      yourOrders: [RECRUIT, UPGRADE],
    });
    expect(listed(fixture)).toEqual(['1. Recruit 1 line', '2. Buy Lancers']);
    expect(
      queryAll(fixture, 'li.order button')[0]?.getAttribute('aria-label'),
    ).toBe('Remove: Recruit 1 line');
    buttonNamed(fixture, 'Remove').click();
    await fixture.whenStable();
    expect(listed(fixture)).toEqual(['1. Buy Lancers']);
  });

  it('marks each order the API refused, and drops the marks once the draft changes', async () => {
    setUpWebTest();
    const { fixture, changes } = await renderPanel({
      ...weekMatch(0),
      yourOrders: [RECRUIT, UPGRADE],
    });
    buttonNamed(fixture, 'Remove').click();
    await fixture.whenStable();
    await addRecruit(fixture);
    buttonNamed(fixture, 'Save orders').click();
    httpTesting()
      .expectOne(ORDERS_URL)
      .flush(
        {
          statusCode: 422,
          code: 'orders.invalid',
          message: '',
          problems: [{ orderIndex: 0, reason: 'insufficientSupply' }],
        } satisfies ApiError,
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await fixture.whenStable();
    expect(query(fixture, 'li.order--refused').textContent).toContain(
      'Not enough supply.',
    );
    expect(textOf(fixture)).toContain('Some orders cannot be carried out.');
    expect(changes).toEqual([]);
    await addRecruit(fixture);
    expect(queryAll(fixture, 'li.order--refused')).toHaveLength(0);
  });

  it('warns when the draft costs more supply than you have', async () => {
    setUpWebTest();
    const { fixture } = await renderPanel({
      ...weekMatch(0),
      yourOrders: [UPGRADE, UPGRADE],
    });
    expect(textOf(fixture)).toContain(
      'These orders cost more supply than you have.',
    );
  });

  it('shows the saved orders read-only after the deadline', async () => {
    setUpWebTest();
    const { fixture } = await renderPanel({
      ...weekMatch(0),
      openDay: null,
      yourOrders: [RECRUIT],
    });
    expect(listed(fixture)).toEqual(['1. Recruit 1 line']);
    expect(textOf(fixture)).toContain('Orders are closed for today.');
    expect(hasButton(fixture, 'Remove')).toBe(false);
    expect(hasButton(fixture, 'Save orders')).toBe(false);
  });

  it.each([
    { kind: 'Move', field: '#move-from' },
    { kind: 'Support with artillery', field: '#support-from' },
    { kind: 'Buy an upgrade', field: 'input[name=upgrade]' },
    { kind: 'Use your ability', field: '.ability__text' },
  ])('offers the $kind form', async ({ kind, field }) => {
    setUpWebTest();
    const { fixture } = await renderPanel();
    choose(query<HTMLSelectElement>(fixture, '#order-kind'), 'Recruit');
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#order-kind'), kind);
    await fixture.whenStable();
    expect(query(fixture, field)).toBeDefined();
  });

  it('adds an order from every form', async () => {
    setUpWebTest();
    const { fixture } = await renderPanel({ ...weekMatch(0) });
    choose(query<HTMLSelectElement>(fixture, '#order-kind'), 'Buy an upgrade');
    await fixture.whenStable();
    query<HTMLInputElement>(fixture, 'input[value=lancers]').dispatchEvent(
      new Event('change'),
    );
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    choose(
      query<HTMLSelectElement>(fixture, '#order-kind'),
      'Use your ability',
    );
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    choose(
      query<HTMLSelectElement>(fixture, '#order-kind'),
      'Support with artillery',
    );
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#support-from'), 'A1');
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#support-target'), 'A2');
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    choose(query<HTMLSelectElement>(fixture, '#order-kind'), 'Move');
    await fixture.whenStable();
    fixture.componentRef.setInput('planFromZoneId', toZoneId('A1'));
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#move-to'), 'B1');
    enter(query<HTMLInputElement>(fixture, '#move-skirmishers'), '1');
    TestBed.tick();
    httpTesting()
      .expectOne('/api/matches/match-1/preview')
      .flush({ kind: 'unopposed' });
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    await fixture.whenStable();
    expect(listed(fixture)).toEqual([
      '1. Buy Lancers',
      '2. Use Grand Battery',
      '3. 1 artillery in A1 support A2',
      '4. Move 1 skirmisher from A1 to B1',
    ]);
    expect(textOf(fixture)).toContain('1 of 5 moves');
  });
});
