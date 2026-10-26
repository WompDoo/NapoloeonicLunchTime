import { findDuplicates } from '../core/decode';
import { EngineContractError } from '../core/engine-error';
import type { ZoneId } from '../core/ids';
import {
  addUnitCounts,
  areValidUnitCounts,
  hasAnyUnits,
  NO_UNITS,
  unitCountsContain,
} from '../core/unit-counts';
import type { UnitCounts } from '../core/unit-types';
import type { MatchConfig } from '../config/match-config';
import { areZonesAdjacent, isZoneOnMap } from '../map/map-queries';
import type { MatchState, PlayerState } from '../state/match-state';
import {
  findPlayer,
  findZone,
  unitsOfPlayerInZone,
} from '../state/match-state-queries';
import type {
  AcceptedOrders,
  MoveOrder,
  Order,
  OrderRejection,
  OrderRejectionReason,
  OrderValidationResult,
  PlayerOrders,
  RecruitOrder,
} from './orders';

interface OrderValidationContext {
  readonly state: MatchState;
  readonly config: MatchConfig;
  readonly player: PlayerState;
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

interface OrderKindHandler<TOrder extends Order> {
  readonly rules: readonly OrderRule<TOrder>[];
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
      recruitOrderCost(order, context.config) <=
      remainingSupply(accepted, context),
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
      isZoneOnMap(context.config.map, order.fromZoneId) &&
      isZoneOnMap(context.config.map, order.toZoneId),
  },
  {
    reason: 'zonesNotAdjacent',
    isSatisfied: ({ order, context }): boolean =>
      areZonesAdjacent(context.config.map, order.fromZoneId, order.toZoneId),
  },
  {
    reason: 'insufficientUnits',
    isSatisfied: ({ order, accepted, context }): boolean =>
      unitCountsContain(
        unitsOfPlayerInZone(
          findZone(context.state, order.fromZoneId),
          context.player.playerId,
        ),
        addUnitCounts(
          unitsAlreadyMovingFrom(accepted, order.fromZoneId),
          order.units,
        ),
      ),
  },
  {
    reason: 'moveOrderLimitReached',
    isSatisfied: ({ accepted, context }): boolean =>
      accepted.moves.length < context.config.orders.maxMoveOrdersPerTurn,
  },
];

const ORDER_KIND_HANDLERS: OrderKindHandlers = {
  recruit: {
    rules: RECRUIT_RULES,
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      recruits: [...accepted.recruits, order],
    }),
  },
  move: {
    rules: MOVE_RULES,
    accept: (accepted, order): AcceptedOrders => ({
      ...accepted,
      moves: [...accepted.moves, order],
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
  config: MatchConfig,
): number {
  return config.economy.recruitCost[order.unitType] * order.count;
}

function validatePlayerOrders(
  orders: readonly Order[],
  context: OrderValidationContext,
): PlayerValidation {
  const initial: PlayerValidation = {
    accepted: { playerId: context.player.playerId, recruits: [], moves: [] },
    rejections: [],
  };
  return orders.reduce(
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
  const brokenRule = handler.rules.find(
    (rule): boolean =>
      !rule.isSatisfied({ order, accepted: validation.accepted, context }),
  );
  return brokenRule === undefined
    ? { ...validation, accepted: handler.accept(validation.accepted, order) }
    : {
        ...validation,
        rejections: [
          ...validation.rejections,
          {
            playerId: context.player.playerId,
            orderIndex,
            order,
            reason: brokenRule.reason,
          },
        ],
      };
}

function remainingSupply(
  accepted: AcceptedOrders,
  context: OrderValidationContext,
): number {
  return accepted.recruits.reduce(
    (supply, recruit): number =>
      supply - recruitOrderCost(recruit, context.config),
    context.player.supply,
  );
}

function unitsAlreadyMovingFrom(
  accepted: AcceptedOrders,
  zoneId: ZoneId,
): UnitCounts {
  return accepted.moves
    .filter((move): boolean => move.fromZoneId === zoneId)
    .reduce(
      (total, move): UnitCounts => addUnitCounts(total, move.units),
      NO_UNITS,
    );
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
