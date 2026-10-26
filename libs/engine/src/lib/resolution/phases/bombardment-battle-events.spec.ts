import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import type { TestStateOptions } from '../../../testing/test-state';
import {
  createTestState,
  P1,
  P2,
  P3,
  supportOrder,
  units,
} from '../../../testing/test-state';
import type { PlayerOrders } from '../../orders/orders';
import type { ResolutionState } from '../resolution-state';
import { applyBombardmentPhase } from './bombardment-phase';

function bombard(
  options: TestStateOptions,
  submissions: readonly PlayerOrders[],
): ResolutionState {
  const state = createTestState(options);
  return applyBombardmentPhase(
    startResolution(state),
    createTestContext(state, submissions, TEST_CONFIG),
  );
}

describe('bombardment phase battle events', () => {
  it('records every battle as it formed, before any gun fires', () => {
    const result = bombard(
      {
        zones: {
          A2: { owner: P1, units: { artillery: 1 } },
          B2: {
            owner: P2,
            armies: [
              { playerId: P1, units: { line: 2 } },
              { playerId: P2, units: { line: 1, cavalry: 1 } },
            ],
          },
        },
      },
      [{ playerId: P1, orders: [supportOrder('A2', 'B2', 1)] }],
    );
    expect(result.replayLog[0]).toEqual({
      type: 'BattleFormed',
      turnNumber: 1,
      zoneId: 'B2',
      sides: [
        { playerId: P1, role: 'attacker', units: units({ line: 2 }) },
        {
          playerId: P2,
          role: 'defender',
          units: units({ line: 1, cavalry: 1 }),
        },
      ],
    });
    expect(
      eventsOfType(result.replayLog, 'BattleDecidedByBombardment'),
    ).toEqual([]);
  });

  it('ends a battle before combat when bombardment leaves one army standing', () => {
    const result = bombard(
      {
        zones: {
          A2: { owner: P1, units: { artillery: 2 } },
          B2: {
            owner: P2,
            armies: [
              { playerId: P1, units: { line: 1 } },
              { playerId: P2, units: { artillery: 1 } },
            ],
          },
        },
      },
      [{ playerId: P1, orders: [supportOrder('A2', 'B2', 2)] }],
    );
    expect(
      eventsOfType(result.replayLog, 'BattleDecidedByBombardment'),
    ).toEqual([
      {
        type: 'BattleDecidedByBombardment',
        turnNumber: 1,
        zoneId: 'B2',
        survivorId: P1,
      },
    ]);
  });

  it('can leave nobody standing', () => {
    const result = bombard(
      {
        zones: {
          A2: { owner: P1, units: { artillery: 1 } },
          B3: { owner: P2, units: { artillery: 1 } },
          B2: {
            armies: [
              { playerId: P1, units: { line: 1 } },
              { playerId: P2, units: { line: 1 } },
            ],
          },
          C2: { owner: P3 },
        },
      },
      [
        { playerId: P1, orders: [supportOrder('A2', 'B2', 1)] },
        { playerId: P2, orders: [supportOrder('B3', 'B2', 1)] },
      ],
    );
    expect(
      eventsOfType(result.replayLog, 'BattleDecidedByBombardment'),
    ).toEqual([
      {
        type: 'BattleDecidedByBombardment',
        turnNumber: 1,
        zoneId: 'B2',
        survivorId: null,
      },
    ]);
  });
});
