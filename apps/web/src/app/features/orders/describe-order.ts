import type { AbilityTarget, Order } from '@lunch-campaign/engine';
import type { Translator } from '../../core/i18n/translator';
import { unitsText } from '../../shared/army-text';
import { commanderAbilityName, upgradeName } from '../../shared/content-keys';

type OrderOfKind<TKind extends Order['kind']> = Extract<
  Order,
  { readonly kind: TKind }
>;
type TargetOfKind<TKind extends AbilityTarget['kind']> = Extract<
  AbilityTarget,
  { readonly kind: TKind }
>;

interface DescribeContext {
  readonly translator: Translator;
  /** The viewer's commander, whose ability a "use ability" order uses. */
  readonly commanderId: string;
}

type OrderDescribers = {
  readonly [TKind in Order['kind']]: (
    order: OrderOfKind<TKind>,
    context: DescribeContext,
  ) => string;
};

type TargetDescribers = {
  readonly [TKind in AbilityTarget['kind']]: (
    target: TargetOfKind<TKind>,
    ability: string,
    translator: Translator,
  ) => string;
};

const TARGET_DESCRIBERS: TargetDescribers = {
  none: (_target, ability, translator): string =>
    translator.translate('orders.describe.ability', { ability }),
  ownedZone: (target, ability, translator): string =>
    translator.translate('orders.describe.abilityZone', {
      ability,
      zone: target.zoneId,
    }),
  reinforcement: (target, ability, translator): string =>
    translator.translate('orders.describe.abilityReinforce', {
      ability,
      units: unitsText(target.units, translator),
      from: target.fromZoneId,
      to: target.toZoneId,
    }),
};

const ORDER_DESCRIBERS: OrderDescribers = {
  move: (order, { translator }): string =>
    translator.translate(
      order.viaZoneIds.length === 0
        ? 'orders.describe.move'
        : 'orders.describe.moveVia',
      {
        units: unitsText(order.units, translator),
        from: order.fromZoneId,
        via: order.viaZoneIds.join(', '),
        to: order.toZoneId,
      },
    ),
  recruit: (order, { translator }): string =>
    translator.translate('orders.describe.recruit', {
      units: translator.translate(`units.${order.unitType}`, {
        count: order.count,
      }),
    }),
  support: (order, { translator }): string =>
    translator.translate('orders.describe.support', {
      count: order.count,
      from: order.fromZoneId,
      target: order.targetZoneId,
    }),
  buyUpgrade: (order, { translator }): string =>
    translator.translate('orders.describe.buyUpgrade', {
      upgrade: translator.translate(upgradeName(order.upgradeId)),
    }),
  useAbility: (order, { translator, commanderId }): string => {
    const describe = TARGET_DESCRIBERS[order.target.kind] as (
      target: AbilityTarget,
      ability: string,
      translator: Translator,
    ) => string;
    return describe(
      order.target,
      translator.translate(commanderAbilityName(commanderId)),
      translator,
    );
  },
};

/** "Move 3 line from A1 to B2", in the viewer's language. */
export function describeOrder(order: Order, context: DescribeContext): string {
  const describe = ORDER_DESCRIBERS[order.kind] as (
    order: Order,
    context: DescribeContext,
  ) => string;
  return describe(order, context);
}
