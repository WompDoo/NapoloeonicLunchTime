import type { ApiError, OrderRulesView } from '@lunch-campaign/contracts';
import type { Order, OrderRejectionReason } from '@lunch-campaign/engine';

type OrderOfKind<TKind extends Order['kind']> = Extract<
  Order,
  { readonly kind: TKind }
>;

type OrderCosts = {
  readonly [TKind in Order['kind']]: (
    order: OrderOfKind<TKind>,
    rules: OrderRulesView,
  ) => number;
};

const FREE = 0;

/** What each order costs in supply when it is carried out. */
const ORDER_COSTS: OrderCosts = {
  recruit: (order, rules): number =>
    order.count * rules.recruitCost[order.unitType],
  move: (): number => FREE,
  support: (): number => FREE,
  buyUpgrade: (_order, rules): number => rules.upgradeCost,
  useAbility: (): number => FREE,
};

export function orderCost(order: Order, rules: OrderRulesView): number {
  const cost = ORDER_COSTS[order.kind] as (
    order: Order,
    rules: OrderRulesView,
  ) => number;
  return cost(order, rules);
}

/** Supply the orders would spend tonight. */
export function supplyCommitted(
  orders: readonly Order[],
  rules: OrderRulesView,
): number {
  return orders.reduce(
    (total, order): number => total + orderCost(order, rules),
    0,
  );
}

export function movesUsed(orders: readonly Order[]): number {
  return orders.filter((order): boolean => order.kind === 'move').length;
}

/** Why the API refused the order at this position of the last submission; empty when it did not. */
export function problemsAt(
  error: ApiError | null,
  orderIndex: number,
): readonly OrderRejectionReason[] {
  return error === null
    ? []
    : error.problems
        .filter((problem): boolean => problem.orderIndex === orderIndex)
        .map((problem): OrderRejectionReason => problem.reason);
}

export function withoutOrderAt(
  orders: readonly Order[],
  orderIndex: number,
): readonly Order[] {
  return orders.filter((_order, index): boolean => index !== orderIndex);
}
