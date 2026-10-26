import { EngineContractError } from '../core/engine-error';
import type { PlayerOrders } from '../orders/orders';
import { createInitialMatchState } from '../state/create-initial-match-state';
import type { MatchState } from '../state/match-state';
import { findPlayer, findZone } from '../state/match-state-queries';
import { describeTurn } from '../../testing/describe-board';
import { TEST_CONFIG } from '../../testing/test-config';
import {
  createTestState,
  deepFreeze,
  moveOrder,
  P1,
  P2,
  P3,
  P4,
  recruitOrder,
  units,
  zoneId,
} from '../../testing/test-state';
import { isMatchFinished, resolveTurn } from './resolve-turn';
import { RESOLUTION_ORDER } from './resolution-phases';

const OPENING_STATE = createInitialMatchState(
  TEST_CONFIG,
  [
    { playerId: P1, seat: 1, commanderId: 'plain' },
    { playerId: P2, seat: 2, commanderId: 'plain' },
    { playerId: P3, seat: 3, commanderId: 'plain' },
    { playerId: P4, seat: 4, commanderId: 'plain' },
  ],
  'opening-seed',
);

const OPENING_ORDERS: readonly PlayerOrders[] = [
  {
    playerId: P1,
    orders: [
      moveOrder('A1', 'A2', { line: 2, cavalry: 2 }),
      moveOrder('A1', 'B1', { skirmishers: 1 }),
      recruitOrder('line', 1),
    ],
  },
  {
    playerId: P2,
    orders: [
      moveOrder('A3', 'A2', { cavalry: 2, skirmishers: 2 }),
      recruitOrder('cavalry', 2),
      recruitOrder('line', 1),
    ],
  },
  {
    playerId: P3,
    orders: [
      moveOrder('C1', 'B1', { line: 3 }),
      moveOrder('C1', 'C2', { artillery: 1 }),
    ],
  },
];

describe('resolveTurn', () => {
  it('runs the phases in the order the rules define', () => {
    expect(RESOLUTION_ORDER).toEqual([
      'purchase',
      'movement',
      'reinforcement',
      'bombardment',
      'combat',
      'capture',
      'production',
      'scoring',
      'cleanup',
    ]);
  });

  it('is deterministic: identical inputs give byte-identical outputs', () => {
    const first = resolveTurn(OPENING_STATE, OPENING_ORDERS, TEST_CONFIG);
    const second = resolveTurn(
      structuredClone(OPENING_STATE),
      structuredClone(OPENING_ORDERS),
      TEST_CONFIG,
    );
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('does not depend on the order submissions arrive in', () => {
    const forwards = resolveTurn(OPENING_STATE, OPENING_ORDERS, TEST_CONFIG);
    const backwards = resolveTurn(
      OPENING_STATE,
      [...OPENING_ORDERS].reverse(),
      TEST_CONFIG,
    );
    expect(JSON.stringify(backwards)).toBe(JSON.stringify(forwards));
  });

  it('never mutates its inputs', () => {
    const state = deepFreeze(structuredClone(OPENING_STATE));
    const orders = deepFreeze(structuredClone(OPENING_ORDERS));
    const config = deepFreeze(structuredClone(TEST_CONFIG));
    expect(() => resolveTurn(state, orders, config)).not.toThrow();
    expect(state).toEqual(OPENING_STATE);
  });

  it('resolves the opening night (snapshot)', () => {
    const { state, replayLog } = resolveTurn(
      OPENING_STATE,
      OPENING_ORDERS,
      TEST_CONFIG,
    );
    expect(describeTurn(state, replayLog, TEST_CONFIG)).toMatchSnapshot();
  });

  it('logs rejected orders first and still resolves the rest', () => {
    const { state, replayLog } = resolveTurn(
      OPENING_STATE,
      [
        {
          playerId: P1,
          orders: [
            moveOrder('A1', 'B2', { line: 1 }),
            moveOrder('A1', 'A2', { line: 1 }),
          ],
        },
      ],
      TEST_CONFIG,
    );
    expect(replayLog[0]).toEqual({
      type: 'OrderRejected',
      turnNumber: 1,
      playerId: P1,
      orderIndex: 0,
      order: moveOrder('A1', 'B2', { line: 1 }),
      reason: 'zonesNotAdjacent',
    });
    expect(findZone(state, zoneId('A2')).armies).toEqual([
      { playerId: P1, units: units({ line: 1 }) },
    ]);
  });

  it('advances to the next turn', () => {
    expect(resolveTurn(OPENING_STATE, [], TEST_CONFIG).state.turnNumber).toBe(
      2,
    );
  });

  it('holds everything for players who submit nothing', () => {
    const { state } = resolveTurn(OPENING_STATE, [], TEST_CONFIG);
    expect(state.zones.map((zone) => zone.armies)).toEqual(
      OPENING_STATE.zones.map((zone) => zone.armies),
    );
  });

  describe('phase order consequences', () => {
    it('lets recruits defend the night they are bought', () => {
      const state = createTestState({
        zones: {
          A1: { owner: P1, units: { line: 1 } },
          A2: { owner: P2, units: { line: 3 } },
        },
      });
      const { state: after } = resolveTurn(
        state,
        [
          { playerId: P1, orders: [recruitOrder('line', 2)] },
          { playerId: P2, orders: [moveOrder('A2', 'A1', { line: 3 })] },
        ],
        TEST_CONFIG,
      );
      // 3 defending line · 1.25 = 3.75 beats 3 attacking line
      expect(findZone(after, zoneId('A1'))).toEqual({
        zoneId: 'A1',
        ownerId: P1,
        armies: [{ playerId: P1, units: units({ line: 1 }) }],
      });
    });

    it('captures an empty zone without a battle, and the new owner produces from it that night', () => {
      const state = createTestState({
        players: [{ supply: 0 }, { supply: 0 }, {}, {}],
        zones: { A2: { owner: P1, units: { line: 1 } }, A3: { owner: P2 } },
      });
      const { state: after, replayLog } = resolveTurn(
        state,
        [{ playerId: P1, orders: [moveOrder('A2', 'A3', { line: 1 })] }],
        TEST_CONFIG,
      );
      expect(findZone(after, zoneId('A3')).ownerId).toBe(P1);
      expect(findZone(after, zoneId('A2'))).toEqual({
        zoneId: 'A2',
        ownerId: P1,
        armies: [],
      });
      expect(findPlayer(after, P1).supply).toBe(1 + 3);
      expect(findPlayer(after, P2).supply).toBe(0);
      expect(replayLog.some((event) => event.type === 'BattleResolved')).toBe(
        false,
      );
    });

    it('scores cities captured on a scoring night', () => {
      const state = createTestState({
        turnNumber: 3,
        zones: { A2: { owner: P1, units: { line: 1 } } },
      });
      const { state: after } = resolveTurn(
        state,
        [{ playerId: P1, orders: [moveOrder('A2', 'B2', { line: 1 })] }],
        TEST_CONFIG,
      );
      expect(findPlayer(after, P1).score).toBe(3);
    });

    it('lets a zone keep its owner when a battle there leaves nobody standing', () => {
      const state = createTestState({
        zones: {
          B2: { owner: P3 },
          A2: { owner: P1, units: { line: 2 } },
          B1: { owner: P2, units: { line: 2 } },
        },
      });
      const { state: after } = resolveTurn(
        state,
        [
          { playerId: P1, orders: [moveOrder('A2', 'B2', { line: 2 })] },
          { playerId: P2, orders: [moveOrder('B1', 'B2', { line: 2 })] },
        ],
        TEST_CONFIG,
      );
      expect(findZone(after, zoneId('B2'))).toEqual({
        zoneId: 'B2',
        ownerId: P3,
        armies: [],
      });
    });
  });

  it('resolves a contested scoring night with a head-on clash and a multi-way battle (snapshot)', () => {
    const state: MatchState = createTestState({
      turnNumber: 3,
      zones: {
        A1: { owner: P1, units: { line: 2, artillery: 1 } },
        A2: { owner: P1, units: { line: 3, skirmishers: 1 } },
        A3: { owner: P2, units: { cavalry: 1 } },
        B3: { owner: P2, units: { cavalry: 4, skirmishers: 1 } },
        B2: { owner: P3, units: { skirmishers: 2 } },
        C1: { owner: P3, units: { line: 2 } },
        C2: { owner: P4, units: { line: 2, cavalry: 2 } },
        C3: { owner: P4, units: { line: 1 } },
      },
    });
    const orders: readonly PlayerOrders[] = [
      {
        playerId: P1,
        orders: [
          moveOrder('A2', 'B2', { line: 3 }),
          recruitOrder('skirmishers', 2),
        ],
      },
      {
        playerId: P2,
        orders: [
          moveOrder('B3', 'B2', { cavalry: 4 }),
          moveOrder('A3', 'A2', { cavalry: 1 }),
        ],
      },
      {
        playerId: P4,
        orders: [
          moveOrder('C2', 'C1', { line: 2 }),
          moveOrder('C2', 'B2', { cavalry: 2 }),
        ],
      },
      { playerId: P3, orders: [moveOrder('C1', 'C2', { line: 2 })] },
    ];
    const { state: after, replayLog } = resolveTurn(state, orders, TEST_CONFIG);
    expect(describeTurn(after, replayLog, TEST_CONFIG)).toMatchSnapshot();
  });

  it('refuses to resolve a turn after the schedule ends', () => {
    const finished = createTestState({
      turnNumber: TEST_CONFIG.schedule.length + 1,
    });
    expect(isMatchFinished(finished, TEST_CONFIG)).toBe(true);
    expect(isMatchFinished(OPENING_STATE, TEST_CONFIG)).toBe(false);
    expect(() => resolveTurn(finished, [], TEST_CONFIG)).toThrow(
      new EngineContractError(
        'Turn 6 is not on the schedule: the match is finished',
      ),
    );
  });
});
