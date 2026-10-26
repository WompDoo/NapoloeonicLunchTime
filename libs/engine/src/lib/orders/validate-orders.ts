import { findDuplicates } from '../core/decode';
import { EngineContractError } from '../core/engine-error';
import type { ZoneId } from '../core/ids';
import {
  addUnitCounts,
  areValidUnitCounts,
  hasAnyUnits,
  NO_UNITS,
  unitCountsContain,
  unitCountsOfSingleType,
  unitTypesPresent,
} from '../core/unit-counts';
import type { UnitCounts } from '../core/unit-types';
import type { MatchConfig } from '../config/match-config';
import { findCommander, isKnownUpgrade } from '../config/content-queries';
import { areZonesAdjacent, isZoneOnMap, routeLegs } from '../map/map-queries';
import type {
  AbilityTarget,
  AbilityTargetKind,
} from '../modifiers/ability-target';
import { effectiveParameters } from '../modifiers/effective-parameters';
import type { EffectiveParameters } from '../modifiers/parameters';
import type { MatchState, PlayerState } from '../state/match-state';
import {
  findPlayer,
  findZone,
  unitsOfPlayerInZone,
} from '../state/match-state-queries';
import type {
  AcceptedOrders,
  BuyUpgradeOrder,
  MoveOrder,
  Order,
  OrderRejection,
  OrderRejectionReason,
  OrderValidationResult,
  PlayerOrders,
  RecruitOrder,
  SupportOrder,
  UseAbilityOrder,
} from './orders';
import { moveRoute, noAcceptedOrders } from './orders';

interface OrderValidationContext {
  readonly state: MatchState;
  readonly config: MatchConfig;
  readonly player: PlayerState;
  /** The player's parameters at the start of the turn (costs, move ranges). */
  readonly parameters: EffectiveParameters;
}

interface OrderCheckInput<TOrder extends Order> {
  readonly order: TOrder;
  /** Orders of the same player accepted so far: budgets (supply, units, move count) are spent in submission order. */
  readonly accepted: AcceptedOrders;
  readonly context: OrderValidationContext;
}

interface OrderRule<TOrder extends Order> {
  readonly reason: OrderRejectionReason;
  readonly isSatisfied: (input: OrderCheckInput<TOrder>) => boolean;
}

interface PlayerValidation {
  readonly accepted: AcceptedOrders;
  readonly rejections: readonly OrderRejection[];
}

type OrderOfKind<TKind extends Order['kind']> = Extract<
  Order,
  { readonly kind: TKind }
>;
type AbilityTargetOfKind<TKind extends AbilityTargetKind> = Extract<
  AbilityTarget,
  { readonly kind: TKind }
>;

interface OrderKindHandler<TOrder extends Order> {
  readonly rulesFor: (order: TOrder) => readonly OrderRule<TOrder>[];
  readonly accept: (accepted: AcceptedOrders, order: TOrder) => AcceptedOrders;
}

type OrderKindHandlers = {
  readonly [TKind in Order['kind']]: OrderKindHandler<OrderOfKind<TKind>>;
};

const RECRUIT_RULES: readonly OrderRule<RecruitOrder>[] = [
  {
    reason: 'invalidUnitCount',
    isSatisfied: ({ order }): boolean => isPositiveWholeNumber(order.count),
  },
  {
    reason: 'startingCapitalNotOwned',
    isSatisfied: ({ context }): boolean =>
      findZone(context.state, context.player.startingCapitalZoneId).ownerId ===
      context.player.playerId,
  },
  {
    reason: 'insufficientSupply',
    isSatisfied: ({ order, accepted, context }): boolean =>
      recruitOrderCost(order, context.parameters) <=
      remainingSupply(accepted, context),
  },
];

const UPGRADE_RULES: readonly OrderRule<BuyUpgradeOrder>[] = [
  {
    reason: 'unknownUpgrade',
    isSatisfied: ({ order, context }): boolean =>
      isKnownUpgrade(context.config, order.upgradeId),
  },
  {
    reason: 'upgradeAlreadyOwned',
    isSatisfied: ({ order, accepted, context }): boolean =>
      !context.player.upgrades.includes(order.upgradeId) &&
      !accepted.upgrades.some(
        (upgrade): boolean => upgrade.upgradeId === order.upgradeId,
      ),
  },
  {
    reason: 'insufficientSupply',
    isSatisfied: ({ accepted, context }): boolean =>
      context.parameters.upgradeCost <= remainingSupply(accepted, context),
  },
];

const SUPPORT_RULES: readonly OrderRule<SupportOrder>[] = [
  {
    reason: 'invalidUnitCount',
    isSatisfied: ({ order }): boolean => isPositiveWholeNumber(order.count),
  },
  {
    reason: 'unknownZone',
    isSatisfied: ({ order, context }): boolean =>
      areAllOnMap(context, [order.fromZoneId, order.targetZoneId]),
  },
  {
    reason: 'zonesNotAdjacent',
    isSatisfied: ({ order, context }): boolean =>
      areZonesAdjacent(
        context.config.map,
        order.fromZoneId,
        order.targetZoneId,
      ),
  },
  {
    reason: 'insufficientUnits',
    isSatisfied: ({ order, accepted, context }): boolean =>
      areUnitsAvailable(
        context,
        accepted,
        order.fromZoneId,
        unitCountsOfSingleType('artillery', order.count),
      ),
  },
];

const MOVE_RULES: readonly OrderRule<MoveOrder>[] = [
  {
    reason: 'invalidUnitCount',
    isSatisfied: ({ order }): boolean =>
      areValidUnitCounts(order.units) && hasAnyUnits(order.units),
  },
  {
    reason: 'unknownZone',
    isSatisfied: ({ order, context }): boolean =>
      areAllOnMap(context, moveRoute(order)),
  },
  {
    reason: 'zonesNotAdjacent',
    isSatisfied: ({ order, context }): boolean =>
      routeLegs(moveRoute(order)).every(([fromZoneId, toZoneId]): boolean =>
        areZonesAdjacent(context.config.map, fromZoneId, toZoneId),
      ),
  },
  {
    reason: 'beyondMoveRange',
    isSatisfied: ({ order, context }): boolean =>
      routeLegs(moveRoute(order)).length <=
      shortestMoveRange(order.units, context.parameters),
  },
  {
    reason: 'routeBlocked',
    isSatisfied: ({ order, context }): boolean =>
      order.viaZoneIds.every((zoneId): boolean =>
        isPassableFor(context, zoneId),
      ),
  },
  {
    reason: 'insufficientUnits',
    isSatisfied: ({ order, accepted, context }): boolean =>
      areUnitsAvailable(context, accepted, order.fromZoneId, order.units),
  },
  {
    reason: 'moveOrderLimitReached',
    isSatisfied: ({ accepted, context }): boolean =>
      accepted.moves.length < context.config.orders.maxMoveOrdersPerTurn,
  },
];

const ABILITY_RULES: readonly OrderRule<UseAbilityOrder>[] = [
  {
    reason: 'abilityAlreadyUsed',
    isSatisfied: ({ accepted, context }): boolean =>
      !context.player.abilityUsed && accepted.abilities.length === 0,
  },
  {
    reason: 'wrongAbilityTarget',
    isSatisfied: ({ order, context }): boolean =>
      order.target.kind ===
      findCommander(context.config, context.player.commanderId).ability
        .targetKind,
  },
];

const ABILITY_TARGET_RULES: {
  readonly [TKind in AbilityTargetKind]: readonly OrderRule<UseAbilityOrder>[];
} = {
  none: [],
  ownedZone: [
    targetRule<'ownedZone'>('unknownZone', (target, { context }): boolean =>
      areAllOnMap(context, [target.zoneId]),
    ),
    targetRule<'ownedZone'>(
      'zoneNotOwned',
      (target, { context }): boolean =>
        findZone(context.state, target.zoneId).ownerId ===
        context.player.playerId,
    ),
  ],
  reinforcement: [
    targetRule<'reinforcement'>(
      'invalidUnitCount',
      (target): boolean =>
        areValidUnitCounts(target.units) && hasAnyUnits(target.units),
    ),
    targetRule<'reinforcement'>('unknownZone', (target, { context }): boolean =>
      areAllOnMap(context, [target.fromZoneId, target.toZoneId]),
    ),
    targetRule<'reinforcement'>(
      'zonesNotAdjacent',
      (target, { context }): boolean =>
        areZonesAdjacent(
          context.config.map,
          target.fromZoneId,
          target.toZoneId,
        ),
    ),
    targetRule<'reinforcement'>(
      'insufficientUnits',
      (target, { accepted, context }): boolean =>
        areUnitsAvailable(context, accepted, target.fromZoneId, target.units),
    ),
  ],
};

const ORDER_KIND_HANDLERS: OrderKindHandlers = {
  recruit: {
    rulesFor: (): readonly OrderRule<RecruitOrder>[] => RECRUIT_RULES,
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      recruits: [...accepted.recruits, order],
    }),
  },
  move: {
    rulesFor: (): readonly OrderRule<MoveOrder>[] => MOVE_RULES,
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      moves: [...accepted.moves, order],
    }),
  },
  support: {
    rulesFor: (): readonly OrderRule<SupportOrder>[] => SUPPORT_RULES,
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      supports: [...accepted.supports, order],
    }),
  },
  buyUpgrade: {
    rulesFor: (): readonly OrderRule<BuyUpgradeOrder>[] => UPGRADE_RULES,
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      upgrades: [...accepted.upgrades, order],
    }),
  },
  useAbility: {
    rulesFor: (order): readonly OrderRule<UseAbilityOrder>[] => [
      ...ABILITY_RULES,
      ...ABILITY_TARGET_RULES[order.target.kind],
    ],
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      abilities: [...accepted.abilities, order],
    }),
  },
};

/**
 * Validates every submission against the state at the start of the turn. Invalid orders are skipped and
 * reported; the rest still resolve. Each player's budgets are spent in the order the orders were listed.
 */
export function validateTurnOrders(
  state: MatchState,
  submissions: readonly PlayerOrders[],
  config: MatchConfig,
): OrderValidationResult {
  assertSubmittersAreKnownAndUnique(state, submissions);
  const validations = state.players.map(
    (player): PlayerValidation =>
      validatePlayerOrders(findSubmittedOrders(submissions, player), {
        state,
        config,
        player,
        parameters: effectiveParameters(state, config, player.playerId, null),
      }),
  );
  return {
    accepted: validations.map(
      (validation): AcceptedOrders => validation.accepted,
    ),
    rejections: validations.flatMap(
      (validation): readonly OrderRejection[] => validation.rejections,
    ),
  };
}

export function recruitOrderCost(
  order: RecruitOrder,
  parameters: EffectiveParameters,
): number {
  return parameters.recruitCost[order.unitType] * order.count;
}

function validatePlayerOrders(
  orders: readonly Order[],
  context: OrderValidationContext,
): PlayerValidation {
  const initial: PlayerValidation = {
    accepted: noAcceptedOrders(context.player.playerId),
    rejections: [],
  };
  return context.player.eliminated
    ? {
        ...initial,
        rejections: orders.map(
          (order, orderIndex): OrderRejection =>
            reject(context, order, orderIndex, 'playerEliminated'),
        ),
      }
    : orders.reduce(
        (validation, order, orderIndex): PlayerValidation =>
          validateNextOrder(validation, order, orderIndex, context),
        initial,
      );
}

function validateNextOrder(
  validation: PlayerValidation,
  order: Order,
  orderIndex: number,
  context: OrderValidationContext,
): PlayerValidation {
  const handler = ORDER_KIND_HANDLERS[order.kind] as OrderKindHandler<Order>;
  const brokenRule = handler
    .rulesFor(order)
    .find(
      (rule): boolean =>
        !rule.isSatisfied({ order, accepted: validation.accepted, context }),
    );
  return brokenRule === undefined
    ? { ...validation, accepted: handler.accept(validation.accepted, order) }
    : {
        ...validation,
        rejections: [
          ...validation.rejections,
          reject(context, order, orderIndex, brokenRule.reason),
        ],
      };
}

function reject(
  context: OrderValidationContext,
  order: Order,
  orderIndex: number,
  reason: OrderRejectionReason,
): OrderRejection {
  return { playerId: context.player.playerId, orderIndex, order, reason };
}

function targetRule<TKind extends AbilityTargetKind>(
  reason: OrderRejectionReason,
  check: (
    target: AbilityTargetOfKind<TKind>,
    input: OrderCheckInput<UseAbilityOrder>,
  ) => boolean,
): OrderRule<UseAbilityOrder> {
  return {
    reason,
    // Only listed under its own target kind in ABILITY_TARGET_RULES, so the narrowing holds.
    isSatisfied: (input): boolean =>
      check(input.order.target as AbilityTargetOfKind<TKind>, input),
  };
}

function remainingSupply(
  accepted: AcceptedOrders,
  context: OrderValidationContext,
): number {
  const recruitSpending = accepted.recruits.reduce(
    (total, recruit): number =>
      total + recruitOrderCost(recruit, context.parameters),
    0,
  );
  return (
    context.player.supply -
    recruitSpending -
    accepted.upgrades.length * context.parameters.upgradeCost
  );
}

/** Units already ordered out of the zone: moving, supporting, or joining a battle by ability. */
function unitsCommittedFrom(
  accepted: AcceptedOrders,
  zoneId: ZoneId,
): UnitCounts {
  return [
    ...accepted.moves
      .filter((move): boolean => move.fromZoneId === zoneId)
      .map((move): UnitCounts => move.units),
    ...accepted.supports
      .filter((support): boolean => support.fromZoneId === zoneId)
      .map(
        (support): UnitCounts =>
          unitCountsOfSingleType('artillery', support.count),
      ),
    ...accepted.abilities.flatMap((ability): readonly UnitCounts[] =>
      reinforcementUnitsFrom(ability.target, zoneId),
    ),
  ].reduce(addUnitCounts, NO_UNITS);
}

function reinforcementUnitsFrom(
  target: AbilityTarget,
  zoneId: ZoneId,
): readonly UnitCounts[] {
  return target.kind === 'reinforcement'
    ? unitsLeavingZone(target, zoneId)
    : [];
}

function unitsLeavingZone(
  target: AbilityTargetOfKind<'reinforcement'>,
  zoneId: ZoneId,
): readonly UnitCounts[] {
  return target.fromZoneId === zoneId ? [target.units] : [];
}

function areUnitsAvailable(
  context: OrderValidationContext,
  accepted: AcceptedOrders,
  zoneId: ZoneId,
  units: UnitCounts,
): boolean {
  return unitCountsContain(
    unitsOfPlayerInZone(
      findZone(context.state, zoneId),
      context.player.playerId,
    ),
    addUnitCounts(unitsCommittedFrom(accepted, zoneId), units),
  );
}

function areAllOnMap(
  context: OrderValidationContext,
  zoneIds: readonly ZoneId[],
): boolean {
  return zoneIds.every((zoneId): boolean =>
    isZoneOnMap(context.config.map, zoneId),
  );
}

function shortestMoveRange(
  units: UnitCounts,
  parameters: EffectiveParameters,
): number {
  return Math.min(
    ...unitTypesPresent(units).map(
      (unitType): number => parameters.moveRange[unitType],
    ),
  );
}

/** A zone can be passed through if the mover owns it or nobody stands in it. */
function isPassableFor(
  context: OrderValidationContext,
  zoneId: ZoneId,
): boolean {
  const zone = findZone(context.state, zoneId);
  return zone.ownerId === context.player.playerId || zone.armies.length === 0;
}

function isPositiveWholeNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function findSubmittedOrders(
  submissions: readonly PlayerOrders[],
  player: PlayerState,
): readonly Order[] {
  const submission = submissions.find(
    (candidate): boolean => candidate.playerId === player.playerId,
  );
  return submission === undefined ? [] : submission.orders;
}

function assertSubmittersAreKnownAndUnique(
  state: MatchState,
  submissions: readonly PlayerOrders[],
): void {
  submissions.forEach((submission): void => {
    findPlayer(state, submission.playerId);
  });
  const duplicates = findDuplicates(
    submissions.map((submission): string => submission.playerId),
  );
  if (duplicates.length > 0) {
    throw new EngineContractError(
      `More than one submission for: ${duplicates.join(', ')}`,
    );
  }
}
