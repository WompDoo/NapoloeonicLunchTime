import { EngineContractError } from '../core/engine-error';
import { toPlayerId } from '../core/ids';
import { TEST_CONFIG } from '../../testing/test-config';
import {
  createTestState,
  moveOrder,
  P1,
  P2,
  P3,
  P4,
  recruitOrder,
} from '../../testing/test-state';
import type { Order, OrderRejectionReason } from './orders';
import { baseParameters } from '../modifiers/parameters';
import { recruitOrderCost, validateTurnOrders } from './validate-orders';

const STATE = createTestState({
  zones: {
    A1: {
      owner: P1,
      units: { line: 3, cavalry: 2, skirmishers: 2, artillery: 1 },
    },
    A2: { owner: P1, units: { line: 1 } },
    A3: { owner: P1 },
    C1: { owner: P3, units: { line: 1 } },
  },
});

interface RejectionCase {
  readonly name: string;
  readonly orders: readonly Order[];
  readonly rejected: readonly {
    readonly orderIndex: number;
    readonly reason: OrderRejectionReason;
  }[];
}

function validateForP1(
  orders: readonly Order[],
): ReturnType<typeof validateTurnOrders> {
  return validateTurnOrders(STATE, [{ playerId: P1, orders }], TEST_CONFIG);
}

describe('validateTurnOrders', () => {
  it('accepts valid orders in submission order, split by kind', () => {
    const orders = [
      moveOrder('A1', 'A2', { line: 2 }),
      recruitOrder('line', 1),
      moveOrder('A2', 'B2', { line: 1 }),
      recruitOrder('cavalry', 1),
    ];
    const result = validateForP1(orders);
    expect(result.rejections).toEqual([]);
    expect(result.accepted[0]).toEqual({
      playerId: P1,
      recruits: [orders[1], orders[3]],
      moves: [orders[0], orders[2]],
      supports: [],
      upgrades: [],
      abilities: [],
    });
  });

  it('returns one entry per player in seat order, empty for players who submitted nothing', () => {
    const result = validateTurnOrders(
      STATE,
      [
        { playerId: P3, orders: [moveOrder('C1', 'C2', { line: 1 })] },
        { playerId: P1, orders: [] },
      ],
      TEST_CONFIG,
    );
    expect(result.accepted.map((accepted) => accepted.playerId)).toEqual([
      P1,
      P2,
      P3,
      P4,
    ]);
    expect(result.accepted.map((accepted) => accepted.moves.length)).toEqual([
      0, 0, 1, 0,
    ]);
  });

  it.each<RejectionCase>([
    {
      name: 'a zero recruit count',
      orders: [recruitOrder('line', 0)],
      rejected: [{ orderIndex: 0, reason: 'invalidUnitCount' }],
    },
    {
      name: 'a fractional recruit count',
      orders: [recruitOrder('line', 1.5)],
      rejected: [{ orderIndex: 0, reason: 'invalidUnitCount' }],
    },
    {
      name: 'recruits beyond the supply',
      orders: [recruitOrder('artillery', 2)],
      rejected: [{ orderIndex: 0, reason: 'insufficientSupply' }],
    },
    {
      name: 'only the purchases that no longer fit, in submission order',
      // 6 supply: line ×2 costs 4 → 2 left; cavalry costs 3 → skipped; skirmishers cost 2 → fits
      orders: [
        recruitOrder('line', 2),
        recruitOrder('cavalry', 1),
        recruitOrder('skirmishers', 1),
      ],
      rejected: [{ orderIndex: 1, reason: 'insufficientSupply' }],
    },
    {
      name: 'moves with negative or fractional counts',
      orders: [
        moveOrder('A1', 'A2', { line: -1, cavalry: 2 }),
        moveOrder('A1', 'A2', { line: 0.5 }),
      ],
      rejected: [
        { orderIndex: 0, reason: 'invalidUnitCount' },
        { orderIndex: 1, reason: 'invalidUnitCount' },
      ],
    },
    {
      name: 'moves of nothing',
      orders: [moveOrder('A1', 'A2', {})],
      rejected: [{ orderIndex: 0, reason: 'invalidUnitCount' }],
    },
    {
      name: 'moves from or to zones not on the map',
      orders: [
        moveOrder('Z9', 'A2', { line: 1 }),
        moveOrder('A1', 'Z9', { line: 1 }),
      ],
      rejected: [
        { orderIndex: 0, reason: 'unknownZone' },
        { orderIndex: 1, reason: 'unknownZone' },
      ],
    },
    {
      name: 'moves to zones that are not adjacent',
      orders: [
        moveOrder('A1', 'B2', { line: 1 }),
        moveOrder('A1', 'A1', { line: 1 }),
      ],
      rejected: [
        { orderIndex: 0, reason: 'zonesNotAdjacent' },
        { orderIndex: 1, reason: 'zonesNotAdjacent' },
      ],
    },
    {
      name: 'moves of more units than stand in the zone',
      orders: [moveOrder('A1', 'B1', { line: 4 })],
      rejected: [{ orderIndex: 0, reason: 'insufficientUnits' }],
    },
    {
      name: 'moves from a zone where the player has no army',
      orders: [moveOrder('A3', 'B3', { line: 1 })],
      rejected: [{ orderIndex: 0, reason: 'insufficientUnits' }],
    },
    {
      name: 'moves that together send more units than the zone holds',
      orders: [
        moveOrder('A1', 'A2', { line: 2 }),
        moveOrder('A1', 'B1', { line: 2 }),
        moveOrder('A1', 'B1', { line: 1 }),
      ],
      rejected: [{ orderIndex: 1, reason: 'insufficientUnits' }],
    },
    {
      name: 'moves beyond the daily limit',
      orders: [
        moveOrder('A1', 'A2', { line: 1 }),
        moveOrder('A1', 'A2', { line: 1 }),
        moveOrder('A1', 'B1', { line: 1 }),
        moveOrder('A1', 'B1', { cavalry: 1 }),
        moveOrder('A1', 'B1', { cavalry: 1 }),
        moveOrder('A1', 'B1', { skirmishers: 1 }),
      ],
      rejected: [{ orderIndex: 5, reason: 'moveOrderLimitReached' }],
    },
    {
      name: 'nothing for rejected moves counted against the limit',
      orders: [
        moveOrder('A1', 'B2', { line: 1 }),
        moveOrder('A1', 'A2', { line: 1 }),
        moveOrder('A1', 'A2', { line: 1 }),
        moveOrder('A1', 'B1', { line: 1 }),
        moveOrder('A1', 'B1', { cavalry: 1 }),
        moveOrder('A1', 'B1', { cavalry: 1 }),
      ],
      rejected: [{ orderIndex: 0, reason: 'zonesNotAdjacent' }],
    },
  ])('rejects $name', ({ orders, rejected }) => {
    const result = validateForP1(orders);
    expect(result.rejections).toEqual(
      rejected.map(({ orderIndex, reason }) => ({
        playerId: P1,
        orderIndex,
        order: orders[orderIndex],
        reason,
      })),
    );
    const [accepted] = result.accepted;
    expect(accepted && accepted.recruits.length + accepted.moves.length).toBe(
      orders.length - rejected.length,
    );
  });

  it('rejects recruiting while the starting capital is lost', () => {
    const state = createTestState({
      zones: { A1: { owner: P2, units: { line: 1 } } },
    });
    const result = validateTurnOrders(
      state,
      [{ playerId: P1, orders: [recruitOrder('line', 1)] }],
      TEST_CONFIG,
    );
    expect(result.rejections.map((rejection) => rejection.reason)).toEqual([
      'startingCapitalNotOwned',
    ]);
  });

  it('allows recruiting at an empty starting capital the player still owns', () => {
    const state = createTestState({ zones: { A1: { owner: P1 } } });
    const result = validateTurnOrders(
      state,
      [{ playerId: P1, orders: [recruitOrder('line', 1)] }],
      TEST_CONFIG,
    );
    expect(result.rejections).toEqual([]);
  });

  it('allows moving into own, neutral and enemy zones alike', () => {
    const state = createTestState({
      zones: {
        A2: { owner: P1, units: { line: 3 } },
        A1: { owner: P1 },
        A3: { owner: P2, units: { line: 1 } },
      },
    });
    const orders = [
      moveOrder('A2', 'A1', { line: 1 }),
      moveOrder('A2', 'B2', { line: 1 }),
      moveOrder('A2', 'A3', { line: 1 }),
    ];
    expect(
      validateTurnOrders(state, [{ playerId: P1, orders }], TEST_CONFIG)
        .rejections,
    ).toEqual([]);
  });

  it('rejects submissions from players not in the match', () => {
    expect(() =>
      validateTurnOrders(
        STATE,
        [{ playerId: toPlayerId('ghost'), orders: [] }],
        TEST_CONFIG,
      ),
    ).toThrow(new EngineContractError('Missing player ghost'));
  });

  it('rejects two submissions from one player', () => {
    expect(() =>
      validateTurnOrders(
        STATE,
        [
          { playerId: P1, orders: [] },
          { playerId: P1, orders: [] },
        ],
        TEST_CONFIG,
      ),
    ).toThrow(new EngineContractError('More than one submission for: p1'));
  });

  it('prices recruit orders from the config', () => {
    expect(
      recruitOrderCost(recruitOrder('cavalry', 2), baseParameters(TEST_CONFIG)),
    ).toBe(6);
  });
});
