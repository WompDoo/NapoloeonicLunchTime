import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type { OrderRulesView } from '@lunch-campaign/contracts';
import type { Order } from '@lunch-campaign/engine';
import { NO_UNITS, toZoneId } from '@lunch-campaign/engine';
import {
  movesUsed,
  orderCost,
  problemsAt,
  supplyCommitted,
  withoutOrderAt,
} from './order-drafts';

const RULES: OrderRulesView = {
  maxMoveOrders: 5,
  moveRange: DEFAULT_MATCH_CONFIG.movement.moveRange,
  recruitCost: DEFAULT_MATCH_CONFIG.economy.recruitCost,
  upgradeCost: 6,
  upgradeIds: ['lancers'],
  abilityTargetKind: 'none',
};

const MOVE: Order = {
  kind: 'move',
  fromZoneId: toZoneId('A1'),
  viaZoneIds: [],
  toZoneId: toZoneId('A2'),
  units: NO_UNITS,
};
const RECRUIT: Order = { kind: 'recruit', unitType: 'cavalry', count: 2 };
const SUPPORT: Order = {
  kind: 'support',
  fromZoneId: toZoneId('A1'),
  targetZoneId: toZoneId('A2'),
  count: 1,
};
const UPGRADE: Order = { kind: 'buyUpgrade', upgradeId: 'lancers' };
const ABILITY: Order = { kind: 'useAbility', target: { kind: 'none' } };

describe('order drafts', () => {
  it.each([
    { order: MOVE, cost: 0 },
    { order: RECRUIT, cost: 6 },
    { order: SUPPORT, cost: 0 },
    { order: UPGRADE, cost: 6 },
    { order: ABILITY, cost: 0 },
  ])('a $order.kind order costs $cost', ({ order, cost }) => {
    expect(orderCost(order, RULES)).toBe(cost);
  });

  it('adds up the supply and counts the moves', () => {
    const orders = [MOVE, RECRUIT, MOVE, UPGRADE];
    expect(supplyCommitted(orders, RULES)).toBe(12);
    expect(movesUsed(orders)).toBe(2);
  });

  it('finds the problems with one order of the last submission', () => {
    const refusal = {
      statusCode: 422,
      code: 'orders.invalid',
      message: '',
      problems: [
        { orderIndex: 1, reason: 'insufficientSupply' },
        { orderIndex: 1, reason: 'startingCapitalNotOwned' },
        { orderIndex: 2, reason: 'zonesNotAdjacent' },
      ],
    } as const;
    expect(problemsAt(refusal, 1)).toEqual([
      'insufficientSupply',
      'startingCapitalNotOwned',
    ]);
    expect(problemsAt(refusal, 0)).toEqual([]);
    expect(problemsAt(null, 1)).toEqual([]);
  });

  it('removes one order', () => {
    expect(withoutOrderAt([MOVE, RECRUIT, UPGRADE], 1)).toEqual([
      MOVE,
      UPGRADE,
    ]);
  });
});
