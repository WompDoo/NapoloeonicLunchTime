import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import {
  createTestState,
  P1,
  P2,
  P3,
  units,
  zoneId,
} from '../../../testing/test-state';
import { findZone } from '../../state/match-state-queries';
import {
  eventsOfType,
  firstEventOfType,
} from '../../../testing/replay-queries';
import { applyCombatPhase } from './combat-phase';

describe('combat phase', () => {
  const state = createTestState({
    zones: {
      A1: { owner: P1, units: { line: 2 } },
      A2: {
        owner: P1,
        armies: [
          { playerId: P1, units: { line: 2 } },
          { playerId: P2, units: { cavalry: 4 } },
        ],
      },
      B2: {
        armies: [
          { playerId: P2, units: { line: 3 } },
          { playerId: P3, units: { line: 3 } },
        ],
      },
      C2: {
        owner: P3,
        armies: [
          { playerId: P1, units: { skirmishers: 3 } },
          { playerId: P2, units: { line: 2 } },
        ],
      },
    },
  });
  const result = applyCombatPhase(
    startResolution(state),
    createTestContext(state, [], TEST_CONFIG),
  );

  it('makes the owner the defender when it has units in the zone', () => {
    expect(findZone(result.match, zoneId('A2')).armies).toEqual([
      { playerId: P1, units: units({ line: 1 }) },
    ]);
    const battle = firstEventOfType(result.replayLog, 'BattleResolved');
    expect(battle.zoneId).toBe('A2');
    expect(battle.battle.sides.map((side) => side.role)).toEqual([
      'defender',
      'attacker',
    ]);
  });

  it('fights without a defender when nobody present owns the zone', () => {
    expect(findZone(result.match, zoneId('B2')).armies).toEqual([]);
    expect(findZone(result.match, zoneId('C2')).armies).toEqual([
      { playerId: P1, units: units({ skirmishers: 2 }) },
    ]);
  });

  it('leaves zones with a single army alone and resolves battles in zone id order', () => {
    expect(findZone(result.match, zoneId('A1'))).toEqual(
      findZone(state, zoneId('A1')),
    );
    expect(
      eventsOfType(result.replayLog, 'BattleResolved').map(
        (event) => event.zoneId,
      ),
    ).toEqual(['A2', 'B2', 'C2']);
  });

  it('does not change ownership: that happens in the capture phase', () => {
    expect(findZone(result.match, zoneId('C2')).ownerId).toBe(P3);
  });
});
