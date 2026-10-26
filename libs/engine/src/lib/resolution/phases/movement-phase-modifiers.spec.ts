import type { PlayerOrders } from '../../orders/orders';
import {
  createCommanderPassiveModifier,
  createEventModifier,
} from '../../modifiers/active-modifiers';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { describeUnits } from '../../../testing/describe-board';
import { eventsOfType } from '../../../testing/replay-queries';
import type { TestStateOptions } from '../../../testing/test-state';
import {
  createTestState,
  moveOrder,
  P1,
  P2,
  P3,
} from '../../../testing/test-state';
import type { MatchState } from '../../state/match-state';
import type { ResolutionState } from '../resolution-state';
import { applyMovementPhase } from './movement-phase';

function move(
  options: TestStateOptions,
  submissions: readonly PlayerOrders[],
): ResolutionState {
  const state = createTestState(options);
  return applyMovementPhase(
    startResolution(state),
    createTestContext(state, submissions, TEST_CONFIG),
  );
}

function occupiedZones(state: MatchState): Readonly<Record<string, string>> {
  return Object.fromEntries(
    state.zones
      .filter((zone) => zone.armies.length > 0)
      .map((zone) => [
        zone.zoneId,
        zone.armies
          .map((army) => `${army.playerId}:${describeUnits(army.units)}`)
          .join(' '),
      ]),
  );
}

const FAST_P1 = [createCommanderPassiveModifier(P1, 'charger')];
const TRUCE = [createEventModifier('truce', 1)];

describe('movement phase with modifiers', () => {
  it('moves fast cavalry two zones in one order', () => {
    const result = move(
      {
        zones: { A1: { owner: P1, units: { cavalry: 2 } } },
        modifiers: FAST_P1,
      },
      [
        {
          playerId: P1,
          orders: [moveOrder('A1', 'B2', { cavalry: 2 }, ['A2'])],
        },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({ B2: 'p1:C2' });
    expect(eventsOfType(result.replayLog, 'ArmyMoved')[0]).toMatchObject({
      fromZoneId: 'A1',
      viaZoneIds: ['A2'],
      toZoneId: 'B2',
    });
  });

  it('clashes with a group crossing its second leg the other way', () => {
    const result = move(
      {
        zones: {
          A1: { owner: P1, units: { cavalry: 4 } },
          B2: { owner: P2, units: { skirmishers: 1 } },
        },
        modifiers: FAST_P1,
      },
      [
        {
          playerId: P1,
          orders: [moveOrder('A1', 'B2', { cavalry: 4 }, ['A2'])],
        },
        { playerId: P2, orders: [moveOrder('B2', 'A2', { skirmishers: 1 })] },
      ],
    );
    expect(
      eventsOfType(result.replayLog, 'FieldBattle')[0]?.connection,
    ).toEqual(['A2', 'B2']);
    expect(occupiedZones(result.match)).toEqual({ B2: 'p1:C3' });
  });

  it('fights clashes in connection order, survivors carrying on to the next', () => {
    // p1's fast cavalry A1→A2→B2 meets p3's fast cavalry (A3→A2→A1) on A1-A2, then p2's skirmisher (B2→A2) on A2-B2
    const result = move(
      {
        zones: {
          A1: { owner: P1, units: { cavalry: 6 } },
          B2: { owner: P2, units: { skirmishers: 1 } },
          A3: { owner: P3, units: { cavalry: 1 } },
        },
        modifiers: [...FAST_P1, createCommanderPassiveModifier(P3, 'charger')],
      },
      [
        {
          playerId: P1,
          orders: [moveOrder('A1', 'B2', { cavalry: 6 }, ['A2'])],
        },
        { playerId: P2, orders: [moveOrder('B2', 'A2', { skirmishers: 1 })] },
        {
          playerId: P3,
          orders: [moveOrder('A3', 'A1', { cavalry: 1 }, ['A2'])],
        },
      ],
    );
    expect(
      eventsOfType(result.replayLog, 'FieldBattle').map((event) =>
        event.connection.join('-'),
      ),
    ).toEqual(['A1-A2', 'A2-B2']);
    // 6 cavalry lose ceil(0.5 · 1) = 1 to p3's cavalry, then 1 more to p2's skirmisher: 4 arrive in B2
    expect(occupiedZones(result.match)).toEqual({ B2: 'p1:C4' });
  });

  it('skips a clash when one group was already destroyed', () => {
    const result = move(
      {
        zones: {
          A1: { owner: P1, units: { cavalry: 1 } },
          B2: { owner: P2, units: { skirmishers: 1 } },
          A3: { owner: P3, units: { line: 5 } },
        },
        modifiers: [...FAST_P1, createCommanderPassiveModifier(P3, 'charger')],
      },
      [
        {
          playerId: P1,
          orders: [moveOrder('A1', 'B2', { cavalry: 1 }, ['A2'])],
        },
        { playerId: P2, orders: [moveOrder('B2', 'A2', { skirmishers: 1 })] },
        { playerId: P3, orders: [moveOrder('A3', 'A2', { line: 5 })] },
      ],
    );
    expect(eventsOfType(result.replayLog, 'FieldBattle')).toHaveLength(1);
  });

  describe('under a bounce modifier', () => {
    it('bounces moves into zones owned by others and contested neutral zones, never into own zones', () => {
      const result = move(
        {
          zones: {
            A1: { owner: P1, units: { line: 3 } },
            A3: { owner: P2, units: { line: 3 } },
            C1: { owner: P3, units: { line: 1 } },
            B1: { owner: P1 },
          },
          modifiers: TRUCE,
        },
        [
          {
            playerId: P1,
            orders: [
              moveOrder('A1', 'A2', { line: 1 }),
              moveOrder('A1', 'B1', { line: 1 }),
            ],
          },
          {
            playerId: P2,
            orders: [
              moveOrder('A3', 'A2', { line: 1 }),
              moveOrder('A3', 'B3', { line: 1 }),
            ],
          },
          { playerId: P3, orders: [moveOrder('C1', 'B1', { line: 1 })] },
        ],
      );
      expect(
        eventsOfType(result.replayLog, 'MoveBounced').map(
          (event) => `${event.playerId}:${event.toZoneId}`,
        ),
      ).toEqual(['p1:A2', 'p2:A2', 'p3:B1']);
      expect(occupiedZones(result.match)).toEqual({
        A1: 'p1:L2',
        A3: 'p2:L2',
        B1: 'p1:L1',
        B3: 'p2:L1',
        C1: 'p3:L1',
      });
    });

    it('bounces head-on moves instead of fighting', () => {
      const result = move(
        {
          zones: {
            A2: { owner: P1, units: { line: 2 } },
            B2: { owner: P2, units: { line: 2 } },
          },
          modifiers: TRUCE,
        },
        [
          { playerId: P1, orders: [moveOrder('A2', 'B2', { line: 2 })] },
          { playerId: P2, orders: [moveOrder('B2', 'A2', { line: 2 })] },
        ],
      );
      expect(eventsOfType(result.replayLog, 'FieldBattle')).toEqual([]);
      expect(occupiedZones(result.match)).toEqual({ A2: 'p1:L2', B2: 'p2:L2' });
    });
  });
});

describe('several clashes on one connection', () => {
  it('resolves them in group order, skipping any whose opponent is already destroyed', () => {
    const state = createTestState({
      zones: {
        A1: { owner: P1, units: { cavalry: 2 } },
        A2: { owner: P1, units: { line: 2 } },
        B2: { owner: P2, units: { skirmishers: 3 } },
      },
      modifiers: [createCommanderPassiveModifier(P1, 'charger')],
    });
    const result = applyMovementPhase(
      startResolution(state),
      createTestContext(
        state,
        [
          {
            playerId: P1,
            orders: [
              moveOrder('A2', 'B2', { line: 2 }),
              moveOrder('A1', 'B2', { cavalry: 2 }, ['A2']),
            ],
          },
          { playerId: P2, orders: [moveOrder('B2', 'A2', { skirmishers: 3 })] },
        ],
        TEST_CONFIG,
      ),
    );
    // The cavalry route (A1>A2>B2) sorts first: 2 cavalry (4) beat 3 skirmishers (3) and keep 1. The line never fights.
    const fieldBattles = eventsOfType(result.replayLog, 'FieldBattle');
    expect(fieldBattles).toHaveLength(1);
    expect(
      fieldBattles[0]?.battle.sides.map((side) => side.unitsBefore.cavalry),
    ).toEqual([2, 0]);
    expect(occupiedZones(result.match)).toEqual({ B2: 'p1:L2C1' });
  });
});
