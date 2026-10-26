import { createEventModifier } from '../../modifiers/active-modifiers';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import {
  createTestState,
  P1,
  P2,
  P3,
  units,
} from '../../../testing/test-state';
import type { PhaseStepAction } from '../../modifiers/modifier-definitions';
import { applyReduceLargestArmy, countLosses } from './reduce-largest-army';

const PLAGUE: Extract<PhaseStepAction, { readonly kind: 'reduceLargestArmy' }> =
  {
    kind: 'reduceLargestArmy',
    lossFraction: 0.2,
    minimumArmySizeForMinimumLoss: 2,
    minimumLoss: 1,
  };

describe('reduceLargestArmy', () => {
  it.each([
    { size: 1, losses: 0 },
    { size: 2, losses: 1 },
    { size: 4, losses: 1 },
    { size: 5, losses: 1 },
    { size: 10, losses: 2 },
    { size: 14, losses: 2 },
    { size: 15, losses: 3 },
  ])('loses $losses of an army of $size', ({ size, losses }) => {
    expect(countLosses(size, PLAGUE)).toBe(losses);
  });

  it('rounds down without dropping a unit to floating-point noise', () => {
    expect(countLosses(100, { ...PLAGUE, lossFraction: 0.29 })).toBe(29);
  });

  it('hits each player’s largest army (tie: lowest zone id) in removal order', () => {
    const plague = createEventModifier('plague', 1);
    const state = createTestState({
      zones: {
        A1: { owner: P1, units: { line: 3, cavalry: 2 } },
        A2: { owner: P1, units: { line: 2 } },
        B1: { owner: P2, units: { cavalry: 2 } },
        C1: { owner: P2, units: { skirmishers: 2 } },
        C2: { owner: P3, units: { line: 1 } },
      },
    });
    const result = applyReduceLargestArmy(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
      plague,
      PLAGUE,
    );
    expect(
      eventsOfType(result.replayLog, 'UnitsLostToModifier').map((event) => [
        event.playerId,
        event.zoneId,
        event.units,
      ]),
    ).toEqual([
      [P1, 'A1', units({ line: 1 })],
      [P2, 'B1', units({ cavalry: 1 })],
    ]);
    expect(
      result.match.zones.find((zone) => zone.zoneId === 'C2')?.armies,
    ).toEqual([{ playerId: P3, units: units({ line: 1 }) }]);
  });
});
