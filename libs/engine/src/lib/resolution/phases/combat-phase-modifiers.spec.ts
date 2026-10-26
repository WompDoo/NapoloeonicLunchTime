import {
  createAbilityModifier,
  createUpgradeModifier,
} from '../../modifiers/active-modifiers';
import { findCommander } from '../../config/content-queries';
import { NO_ABILITY_TARGET } from '../../modifiers/ability-target';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import {
  eventsOfType,
  firstEventOfType,
  sideOf,
} from '../../../testing/replay-queries';
import type { ActiveModifier } from '../../modifiers/active-modifiers';
import type { TestStateOptions } from '../../../testing/test-state';
import {
  createTestState,
  P1,
  P2,
  P3,
  units,
  zoneId,
} from '../../../testing/test-state';
import { findZone } from '../../state/match-state-queries';
import type { ResolutionState } from '../resolution-state';
import { applyCombatPhase } from './combat-phase';

function fight(options: TestStateOptions): ResolutionState {
  const state = createTestState(options);
  return applyCombatPhase(
    startResolution(state),
    createTestContext(state, [], TEST_CONFIG),
  );
}

const retreatFor = (playerId: typeof P1): ActiveModifier =>
  createUpgradeModifier(playerId, 'retreat');

/** p2 attacks p1's B2 with overwhelming line; p1 owns A2 and B1 next door. */
const P1_LOSES_B2 = {
  B2: {
    owner: P1,
    armies: [
      {
        playerId: P1,
        units: { line: 2, cavalry: 2, skirmishers: 1, artillery: 1 },
      },
      { playerId: P2, units: { skirmishers: 20 } },
    ],
  },
  A2: { owner: P1 },
  B1: { owner: P1, units: { line: 1 } },
};

describe('combat phase with modifiers', () => {
  describe('Orderly Retreat', () => {
    it('saves one unit of each combat type and retreats it to the lowest-id safe owned zone', () => {
      const result = fight({ zones: P1_LOSES_B2, modifiers: [retreatFor(P1)] });
      expect(findZone(result.match, zoneId('A2')).armies).toEqual([
        { playerId: P1, units: units({ line: 1, cavalry: 1, skirmishers: 1 }) },
      ]);
      expect(eventsOfType(result.replayLog, 'Retreated')).toEqual([
        {
          type: 'Retreated',
          turnNumber: 1,
          playerId: P1,
          fromZoneId: 'B2',
          toZoneId: 'A2',
          units: units({ line: 1, cavalry: 1, skirmishers: 1 }),
        },
      ]);
    });

    it('destroys losers without it', () => {
      const result = fight({ zones: P1_LOSES_B2 });
      expect(eventsOfType(result.replayLog, 'Retreated')).toEqual([]);
      expect(findZone(result.match, zoneId('A2')).armies).toEqual([]);
    });

    it('never retreats into a zone with a battle tonight or another player’s units', () => {
      const result = fight({
        zones: {
          ...P1_LOSES_B2,
          A2: {
            owner: P1,
            armies: [
              { playerId: P1, units: { line: 1 } },
              { playerId: P3, units: { line: 9 } },
            ],
          },
          B1: { owner: P1, armies: [{ playerId: P3, units: { line: 1 } }] },
          B3: { owner: P1 },
        },
        modifiers: [retreatFor(P1)],
      });
      expect(firstEventOfType(result.replayLog, 'Retreated').toZoneId).toBe(
        'B3',
      );
    });

    it('destroys retreating units with nowhere safe to go', () => {
      const result = fight({
        zones: { B2: P1_LOSES_B2.B2, A2: { owner: P2 }, B1: { owner: P3 } },
        modifiers: [retreatFor(P1)],
      });
      expect(eventsOfType(result.replayLog, 'RetreatBlocked')).toEqual([
        {
          type: 'RetreatBlocked',
          turnNumber: 1,
          playerId: P1,
          zoneId: 'B2',
          units: units({ line: 1, cavalry: 1, skirmishers: 1 }),
        },
      ]);
    });

    it('works for every side in a mutual destruction', () => {
      const result = fight({
        zones: {
          B2: {
            armies: [
              { playerId: P1, units: { line: 3 } },
              { playerId: P2, units: { line: 3 } },
            ],
          },
          A2: { owner: P1 },
          B3: { owner: P2 },
        },
        modifiers: [retreatFor(P1), retreatFor(P2)],
      });
      expect(
        eventsOfType(result.replayLog, 'Retreated').map((event) => [
          event.playerId,
          event.toZoneId,
        ]),
      ).toEqual([
        [P1, 'A2'],
        [P2, 'B3'],
      ]);
    });

    it('has nothing to save when only artillery lost', () => {
      const result = fight({
        zones: {
          B2: {
            owner: P1,
            armies: [
              { playerId: P1, units: { artillery: 2 } },
              { playerId: P2, units: { line: 9 } },
            ],
          },
          A2: { owner: P1 },
        },
        modifiers: [retreatFor(P1)],
      });
      expect(eventsOfType(result.replayLog, 'Retreated')).toEqual([]);
      expect(eventsOfType(result.replayLog, 'RetreatBlocked')).toEqual([]);
    });
  });

  it('lets a charging attacker with cavalry cancel the defender bonus', () => {
    const charge = createAbilityModifier(
      P2,
      'charger',
      findCommander(TEST_CONFIG, 'charger').ability,
      NO_ABILITY_TARGET,
      1,
    );
    const zones = {
      B2: {
        owner: P1,
        armies: [
          { playerId: P1, units: { line: 4 } },
          { playerId: P2, units: { cavalry: 4, line: 1 } },
        ],
      },
    };
    // Without the charge: line 4 · (4/5·2 + 1/5·1) · 1.25 = 9 beats the attackers' 4·1 + 1·1 = 5
    expect(
      sideOf(
        firstEventOfType(fight({ zones }).replayLog, 'BattleResolved').battle,
        P1,
      ).strength.totalStrength,
    ).toBe(9);
    expect(
      sideOf(
        firstEventOfType(
          fight({ zones, modifiers: [charge] }).replayLog,
          'BattleResolved',
        ).battle,
        P1,
      ).strength.totalStrength,
    ).toBeCloseTo(7.2, 9);
  });
});
