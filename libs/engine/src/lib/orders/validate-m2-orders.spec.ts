import type { MatchConfig } from '../config/match-config';
import {
  createCommanderPassiveModifier,
  createEventModifier,
  createUpgradeModifier,
} from '../modifiers/active-modifiers';
import type { ActiveModifier } from '../modifiers/active-modifiers';
import { TEST_CONFIG } from '../../testing/test-config';
import { NO_EFFECT } from '../../testing/test-content';
import {
  abilityOrder,
  createTestState,
  moveOrder,
  ownedZoneTarget,
  P1,
  P2,
  recruitOrder,
  reinforcementTarget,
  supportOrder,
  upgradeOrder,
} from '../../testing/test-state';
import type { PlayerState } from '../state/match-state';
import type { Order, OrderRejection, OrderRejectionReason } from './orders';
import { validateTurnOrders } from './validate-orders';

interface SetupOptions {
  readonly player?: Partial<PlayerState>;
  readonly modifiers?: readonly ActiveModifier[];
}

const NO_SETUP: Required<SetupOptions> = { player: {}, modifiers: [] };

function rejectionsFor(
  orders: readonly Order[],
  options?: SetupOptions,
  config?: MatchConfig,
): readonly (OrderRejectionReason | 'accepted')[] {
  const setup = { ...NO_SETUP, ...options };
  const state = createTestState({
    players: [{ supply: 12, ...setup.player }, {}, {}, {}],
    modifiers: setup.modifiers,
    zones: {
      A1: {
        owner: P1,
        units: { line: 3, cavalry: 2, skirmishers: 2, artillery: 2 },
      },
      A2: { owner: P1, units: { line: 1 } },
      B1: { owner: P2 },
      A3: { owner: P2, units: { line: 1 } },
      B2: { owner: P2, units: { line: 1 } },
    },
  });
  const { rejections } = validateTurnOrders(
    state,
    [{ playerId: P1, orders }],
    config ?? TEST_CONFIG,
  );
  return orders.map((_order, index) => outcomeOf(rejections, index));
}

function outcomeOf(
  rejections: readonly OrderRejection[],
  orderIndex: number,
): OrderRejectionReason | 'accepted' {
  const rejection = rejections.find(
    (candidate) => candidate.orderIndex === orderIndex,
  );
  return rejection === undefined ? 'accepted' : rejection.reason;
}

describe('validateTurnOrders for Milestone 2 orders', () => {
  describe('support orders', () => {
    it.each<{
      name: string;
      orders: readonly Order[];
      expected: readonly string[];
    }>([
      {
        name: 'artillery supporting an adjacent zone',
        orders: [supportOrder('A1', 'B1', 2)],
        expected: ['accepted'],
      },
      {
        name: 'a zero count',
        orders: [supportOrder('A1', 'B1', 0)],
        expected: ['invalidUnitCount'],
      },
      {
        name: 'an unknown zone',
        orders: [supportOrder('A1', 'Z9', 1)],
        expected: ['unknownZone'],
      },
      {
        name: 'a zone that is not adjacent',
        orders: [supportOrder('A1', 'B2', 1)],
        expected: ['zonesNotAdjacent'],
      },
      {
        name: 'more artillery than stands there',
        orders: [supportOrder('A1', 'B1', 3)],
        expected: ['insufficientUnits'],
      },
      {
        name: 'artillery split across two targets',
        orders: [supportOrder('A1', 'B1', 1), supportOrder('A1', 'A2', 1)],
        expected: ['accepted', 'accepted'],
      },
      {
        name: 'artillery that is also moving',
        orders: [
          moveOrder('A1', 'A2', { artillery: 2 }),
          supportOrder('A1', 'B1', 1),
        ],
        expected: ['accepted', 'insufficientUnits'],
      },
      {
        name: 'a move of artillery already supporting',
        orders: [
          supportOrder('A1', 'B1', 2),
          moveOrder('A1', 'A2', { artillery: 1 }),
        ],
        expected: ['accepted', 'insufficientUnits'],
      },
    ])('$name', ({ orders, expected }) => {
      expect(rejectionsFor(orders)).toEqual(expected);
    });

    it('does not count support orders against the move limit', () => {
      expect(
        rejectionsFor([
          moveOrder('A1', 'B1', { line: 1 }),
          moveOrder('A1', 'B1', { line: 1 }),
          moveOrder('A1', 'B1', { line: 1 }),
          moveOrder('A1', 'B1', { cavalry: 1 }),
          moveOrder('A1', 'B1', { cavalry: 1 }),
          supportOrder('A1', 'B1', 1),
        ]),
      ).toEqual([
        'accepted',
        'accepted',
        'accepted',
        'accepted',
        'accepted',
        'accepted',
      ]);
    });
  });

  describe('upgrade orders', () => {
    it.each<{
      name: string;
      orders: readonly Order[];
      options?: SetupOptions;
      expected: readonly string[];
    }>([
      {
        name: 'a known upgrade',
        orders: [upgradeOrder('drill')],
        expected: ['accepted'],
      },
      {
        name: 'an unknown upgrade',
        orders: [upgradeOrder('cannons')],
        expected: ['unknownUpgrade'],
      },
      {
        name: 'an upgrade bought on an earlier night',
        orders: [upgradeOrder('drill')],
        options: { player: { upgrades: ['drill'] } },
        expected: ['upgradeAlreadyOwned'],
      },
      {
        name: 'the same upgrade twice in one night',
        orders: [upgradeOrder('drill'), upgradeOrder('drill')],
        expected: ['accepted', 'upgradeAlreadyOwned'],
      },
      {
        name: 'upgrades and recruits sharing one budget in submission order',
        // 12 supply: drill 6, retreat 6, then a line infantry for 2 no longer fits
        orders: [
          upgradeOrder('drill'),
          upgradeOrder('retreat'),
          recruitOrder('line', 1),
        ],
        expected: ['accepted', 'accepted', 'insufficientSupply'],
      },
      {
        name: 'an upgrade the remaining supply cannot cover',
        orders: [recruitOrder('artillery', 2), upgradeOrder('drill')],
        expected: ['accepted', 'insufficientSupply'],
      },
    ])('$name', ({ orders, options, expected }) => {
      expect(rejectionsFor(orders, options)).toEqual(expected);
    });

    it('charges the effective upgrade cost', () => {
      const config: MatchConfig = {
        ...TEST_CONFIG,
        events: [
          ...TEST_CONFIG.events,
          {
            id: 'discount',
            effect: {
              ...NO_EFFECT,
              patches: [
                {
                  kind: 'number',
                  parameter: 'upgradeCost',
                  operation: 'set',
                  value: 4,
                },
              ],
            },
          },
        ],
      };
      expect(
        rejectionsFor(
          [
            upgradeOrder('drill'),
            upgradeOrder('retreat'),
            recruitOrder('line', 2),
          ],
          {
            modifiers: [createEventModifier('discount', 1)],
          },
          config,
        ),
      ).toEqual(['accepted', 'accepted', 'accepted']);
    });
  });

  describe('ability orders', () => {
    it.each<{
      name: string;
      commanderId: string;
      orders: readonly Order[];
      options?: SetupOptions;
      expected: readonly string[];
    }>([
      {
        name: 'an ability with no target',
        commanderId: 'gunner',
        orders: [abilityOrder({ kind: 'none' })],
        expected: ['accepted'],
      },
      {
        name: 'an ability already used',
        commanderId: 'gunner',
        orders: [abilityOrder({ kind: 'none' })],
        options: { player: { abilityUsed: true } },
        expected: ['abilityAlreadyUsed'],
      },
      {
        name: 'two abilities in one night',
        commanderId: 'gunner',
        orders: [
          abilityOrder({ kind: 'none' }),
          abilityOrder({ kind: 'none' }),
        ],
        expected: ['accepted', 'abilityAlreadyUsed'],
      },
      {
        name: 'the wrong kind of target',
        commanderId: 'gunner',
        orders: [abilityOrder(ownedZoneTarget('A1'))],
        expected: ['wrongAbilityTarget'],
      },
      {
        name: 'an owned zone',
        commanderId: 'warden',
        orders: [abilityOrder(ownedZoneTarget('A2'))],
        expected: ['accepted'],
      },
      {
        name: 'a zone owned by someone else',
        commanderId: 'warden',
        orders: [abilityOrder(ownedZoneTarget('B1'))],
        expected: ['zoneNotOwned'],
      },
      {
        name: 'an unknown zone',
        commanderId: 'warden',
        orders: [abilityOrder(ownedZoneTarget('Z9'))],
        expected: ['unknownZone'],
      },
      {
        name: 'reinforcements from an army that holds',
        commanderId: 'marshal',
        orders: [abilityOrder(reinforcementTarget('A1', 'B1', { line: 2 }))],
        expected: ['accepted'],
      },
      {
        name: 'reinforcements of nothing',
        commanderId: 'marshal',
        orders: [abilityOrder(reinforcementTarget('A1', 'B1', {}))],
        expected: ['invalidUnitCount'],
      },
      {
        name: 'reinforcements from an unknown zone',
        commanderId: 'marshal',
        orders: [abilityOrder(reinforcementTarget('Z9', 'B1', { line: 1 }))],
        expected: ['unknownZone'],
      },
      {
        name: 'reinforcements to a zone that is not adjacent',
        commanderId: 'marshal',
        orders: [abilityOrder(reinforcementTarget('A1', 'B2', { line: 1 }))],
        expected: ['zonesNotAdjacent'],
      },
      {
        name: 'reinforcements drawn from units that move',
        commanderId: 'marshal',
        orders: [
          moveOrder('A1', 'A2', { line: 2 }),
          abilityOrder(reinforcementTarget('A1', 'B1', { line: 2 })),
        ],
        expected: ['accepted', 'insufficientUnits'],
      },
      {
        name: 'moves of units already sent as reinforcements',
        commanderId: 'marshal',
        orders: [
          abilityOrder(reinforcementTarget('A1', 'B1', { line: 3 })),
          moveOrder('A1', 'A2', { line: 1 }),
        ],
        expected: ['accepted', 'insufficientUnits'],
      },
    ])('$name', ({ commanderId, orders, options, expected }) => {
      expect(
        rejectionsFor(orders, {
          ...options,
          player: { commanderId, ...options?.player },
        }),
      ).toEqual(expected);
    });
  });

  describe('routes longer than one zone', () => {
    const fastCavalry = {
      modifiers: [createCommanderPassiveModifier(P1, 'charger')],
      player: { commanderId: 'charger' },
    };

    it.each<{
      name: string;
      orders: readonly Order[];
      options?: SetupOptions;
      expected: readonly string[];
    }>([
      {
        name: 'cavalry with a 2-zone range through an owned zone',
        orders: [moveOrder('A1', 'B2', { cavalry: 2 }, ['A2'])],
        options: fastCavalry,
        expected: ['accepted'],
      },
      {
        name: 'cavalry through an empty zone owned by someone else',
        orders: [moveOrder('A1', 'C1', { cavalry: 1 }, ['B1'])],
        options: fastCavalry,
        expected: ['accepted'],
      },
      {
        name: 'a route through enemy units',
        orders: [moveOrder('A1', 'B3', { cavalry: 1 }, ['A2', 'B2'])],
        options: {
          modifiers: [
            createCommanderPassiveModifier(P1, 'charger'),
            createUpgradeModifier(P1, 'longer-range'),
          ],
        },
        expected: ['routeBlocked'],
      },
      {
        name: 'a 2-zone move without the range',
        orders: [moveOrder('A1', 'B2', { cavalry: 1 }, ['A2'])],
        expected: ['beyondMoveRange'],
      },
      {
        name: 'a 2-zone move that brings along a slower type',
        orders: [moveOrder('A1', 'B2', { cavalry: 1, line: 1 }, ['A2'])],
        options: fastCavalry,
        expected: ['beyondMoveRange'],
      },
      {
        name: 'a route with a leg that is not adjacent',
        orders: [moveOrder('A1', 'C2', { cavalry: 1 }, ['A2'])],
        options: fastCavalry,
        expected: ['zonesNotAdjacent'],
      },
      {
        name: 'a route through an unknown zone',
        orders: [moveOrder('A1', 'B2', { cavalry: 1 }, ['Z9'])],
        options: fastCavalry,
        expected: ['unknownZone'],
      },
    ])('$name', ({ orders, options, expected }) => {
      const config: MatchConfig = {
        ...TEST_CONFIG,
        upgrades: [
          ...TEST_CONFIG.upgrades,
          {
            id: 'longer-range',
            effect: {
              ...NO_EFFECT,
              patches: [
                {
                  kind: 'unitTypeNumber',
                  parameter: 'moveRange',
                  unitType: 'cavalry',
                  operation: 'set',
                  value: 3,
                },
              ],
            },
          },
        ],
      };
      expect(rejectionsFor(orders, options, config)).toEqual(expected);
    });

    it('stops units with a move range of 0 from moving at all', () => {
      const config: MatchConfig = {
        ...TEST_CONFIG,
        events: [
          {
            id: 'mud',
            effect: {
              ...NO_EFFECT,
              patches: [
                {
                  kind: 'unitTypeNumber',
                  parameter: 'moveRange',
                  unitType: 'artillery',
                  operation: 'set',
                  value: 0,
                },
              ],
            },
          },
        ],
      };
      expect(
        rejectionsFor(
          [
            moveOrder('A1', 'A2', { artillery: 1 }),
            moveOrder('A1', 'A2', { line: 1 }),
          ],
          {
            modifiers: [createEventModifier('mud', 1)],
          },
          config,
        ),
      ).toEqual(['beyondMoveRange', 'accepted']);
    });
  });

  it('rejects every order of an eliminated player', () => {
    expect(
      rejectionsFor(
        [recruitOrder('line', 1), moveOrder('A1', 'A2', { line: 1 })],
        { player: { eliminated: true } },
      ),
    ).toEqual(['playerEliminated', 'playerEliminated']);
  });
});

describe('units committed elsewhere', () => {
  it('does not count reinforcements from one zone against moves from another', () => {
    const state = createTestState({
      players: [{ commanderId: 'marshal' }, {}, {}, {}],
      zones: {
        A1: { owner: P1, units: { line: 2 } },
        A2: { owner: P1, units: { line: 1 } },
        B1: { owner: P2 },
      },
    });
    const { rejections } = validateTurnOrders(
      state,
      [
        {
          playerId: P1,
          orders: [
            abilityOrder(reinforcementTarget('A1', 'B1', { line: 2 })),
            moveOrder('A2', 'B2', { line: 1 }),
          ],
        },
      ],
      TEST_CONFIG,
    );
    expect(rejections).toEqual([]);
  });
});

describe('abilities without units', () => {
  it('commit no units, so later moves are unaffected', () => {
    const state = createTestState({
      players: [{ commanderId: 'gunner' }, {}, {}, {}],
      zones: { A1: { owner: P1, units: { line: 2 } } },
    });
    const { rejections } = validateTurnOrders(
      state,
      [
        {
          playerId: P1,
          orders: [
            abilityOrder({ kind: 'none' }),
            moveOrder('A1', 'A2', { line: 2 }),
          ],
        },
      ],
      TEST_CONFIG,
    );
    expect(rejections).toEqual([]);
  });
});
