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
  P4,
  units,
} from '../../../testing/test-state';
import { applyGrantFreeUnits } from './grant-free-units';

describe('grantFreeUnits', () => {
  it('grants at the starting capital, else the lowest-id owned city, else the largest army, else nothing', () => {
    const levy = createEventModifier('levy', 1);
    const state = createTestState({
      players: [{}, {}, {}, { eliminated: true }],
      zones: {
        A1: { owner: P1, units: { line: 1 } },
        A3: { owner: P1 },
        B2: { owner: P2 },
        C3: { owner: P2 },
        A2: { owner: P3, units: { line: 1 } },
        B3: { owner: P3, units: { line: 2 } },
        C2: { owner: P3, units: { line: 2 } },
      },
      modifiers: [levy],
    });
    const result = applyGrantFreeUnits(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
      levy,
      {
        kind: 'grantFreeUnits',
        units: units({ line: 3 }),
      },
    );
    expect(
      eventsOfType(result.replayLog, 'UnitsGranted').map((event) => [
        event.playerId,
        event.zoneId,
      ]),
    ).toEqual([
      [P1, 'A1'],
      [P2, 'B2'],
      [P3, 'B3'],
    ]);
    expect(eventsOfType(result.replayLog, 'UnitsGranted')[0]).toEqual({
      type: 'UnitsGranted',
      turnNumber: 1,
      playerId: P1,
      zoneId: 'A1',
      units: units({ line: 3 }),
      modifierId: 'event:levy:1',
    });
    expect(
      result.match.zones.find((zone) => zone.zoneId === 'A1')?.armies,
    ).toEqual([{ playerId: P1, units: units({ line: 4 }) }]);
    expect(P4).toBe('p4');
  });
});
