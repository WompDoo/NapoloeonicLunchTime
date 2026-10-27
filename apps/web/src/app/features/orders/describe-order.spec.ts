import { TestBed } from '@angular/core/testing';
import type { Order } from '@lunch-campaign/engine';
import { createUnitCounts, toZoneId } from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { describeOrder } from './describe-order';

const A1 = toZoneId('A1');
const A2 = toZoneId('A2');
const B2 = toZoneId('B2');

describe('describeOrder', () => {
  it.each([
    {
      order: {
        kind: 'move',
        fromZoneId: A1,
        viaZoneIds: [],
        toZoneId: A2,
        units: createUnitCounts({ line: 2 }),
      },
      text: 'Move 2 line from A1 to A2',
    },
    {
      order: {
        kind: 'move',
        fromZoneId: A1,
        viaZoneIds: [A2],
        toZoneId: B2,
        units: createUnitCounts({ cavalry: 3 }),
      },
      text: 'Move 3 cavalry from A1 through A2 to B2',
    },
    {
      order: { kind: 'recruit', unitType: 'skirmishers', count: 1 },
      text: 'Recruit 1 skirmisher',
    },
    {
      order: { kind: 'support', fromZoneId: A1, targetZoneId: A2, count: 2 },
      text: '2 artillery in A1 support A2',
    },
    {
      order: { kind: 'buyUpgrade', upgradeId: 'lancers' },
      text: 'Buy Lancers',
    },
    {
      order: { kind: 'useAbility', target: { kind: 'none' } },
      text: 'Use Grand Battery',
    },
    {
      order: { kind: 'useAbility', target: { kind: 'ownedZone', zoneId: A1 } },
      text: 'Use Grand Battery on A1',
    },
    {
      order: {
        kind: 'useAbility',
        target: {
          kind: 'reinforcement',
          fromZoneId: A1,
          toZoneId: A2,
          units: createUnitCounts({ line: 1 }),
        },
      },
      text: 'Use Grand Battery: send 1 line from A1 to A2',
    },
  ] satisfies readonly { order: Order; text: string }[])(
    'says "$text"',
    ({ order, text }) => {
      expect(
        describeOrder(order, {
          translator: TestBed.inject(Translator),
          commanderId: 'napoleon',
        }),
      ).toBe(text);
    },
  );
});
