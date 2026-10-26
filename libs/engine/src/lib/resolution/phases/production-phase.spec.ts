import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { createTestState, P1, P2, P3, P4 } from '../../../testing/test-state';
import { applyProductionPhase } from './production-phase';

describe('production phase', () => {
  it('adds supply for every owned zone by kind, occupied or not', () => {
    const state = createTestState({
      players: [{ supply: 1 }, { supply: 0 }, {}, {}],
      zones: {
        A1: { owner: P1, units: { line: 1 } },
        A2: { owner: P1 },
        B1: { owner: P1 },
        B2: { owner: P1 },
        A3: { owner: P2 },
        C2: { owner: P2 },
      },
    });
    const result = applyProductionPhase(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
    );

    expect(result.match.players.map((player) => player.supply)).toEqual([
      1 + 3 + 1 + 1 + 2,
      0 + 3 + 1,
      6,
      6,
    ]);
    expect(result.replayLog).toEqual([
      { type: 'SupplyProduced', turnNumber: 1, playerId: P1, amount: 7 },
      { type: 'SupplyProduced', turnNumber: 1, playerId: P2, amount: 4 },
      { type: 'SupplyProduced', turnNumber: 1, playerId: P3, amount: 0 },
      { type: 'SupplyProduced', turnNumber: 1, playerId: P4, amount: 0 },
    ]);
  });
});
