import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import {
  createTestState,
  P1,
  P2,
  recruitOrder,
  units,
  zoneId,
} from '../../../testing/test-state';
import { findPlayer, findZone } from '../../state/match-state-queries';
import { applyPurchasePhase } from './purchase-phase';

describe('purchase phase', () => {
  const state = createTestState({
    zones: { A1: { owner: P1, units: { line: 1 } }, A3: { owner: P2 } },
  });

  it('pays for recruits and places them at the starting capital, creating an army if needed', () => {
    const context = createTestContext(
      state,
      [
        { playerId: P2, orders: [recruitOrder('skirmishers', 2)] },
        {
          playerId: P1,
          orders: [recruitOrder('line', 1), recruitOrder('artillery', 1)],
        },
      ],
      TEST_CONFIG,
    );
    const result = applyPurchasePhase(startResolution(state), context);

    expect(findZone(result.match, zoneId('A1')).armies).toEqual([
      { playerId: P1, units: units({ line: 2, artillery: 1 }) },
    ]);
    expect(findZone(result.match, zoneId('A3')).armies).toEqual([
      { playerId: P2, units: units({ skirmishers: 2 }) },
    ]);
    expect(findPlayer(result.match, P1).supply).toBe(0);
    expect(findPlayer(result.match, P2).supply).toBe(2);
    expect(result.replayLog).toEqual([
      {
        type: 'UnitsRecruited',
        turnNumber: 1,
        playerId: P1,
        zoneId: 'A1',
        unitType: 'line',
        count: 1,
        cost: 2,
      },
      {
        type: 'UnitsRecruited',
        turnNumber: 1,
        playerId: P1,
        zoneId: 'A1',
        unitType: 'artillery',
        count: 1,
        cost: 4,
      },
      {
        type: 'UnitsRecruited',
        turnNumber: 1,
        playerId: P2,
        zoneId: 'A3',
        unitType: 'skirmishers',
        count: 2,
        cost: 4,
      },
    ]);
  });

  it('changes nothing when nobody recruits', () => {
    const result = applyPurchasePhase(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
    );
    expect(result).toEqual(startResolution(state));
  });
});
