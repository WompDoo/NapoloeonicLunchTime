import { findCommander } from '../../config/content-queries';
import { NO_ABILITY_TARGET } from '../../modifiers/ability-target';
import {
  createAbilityModifier,
  createUpgradeModifier,
} from '../../modifiers/active-modifiers';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import { createTestState, P1, P2, P3, P4 } from '../../../testing/test-state';
import { applyCleanupPhase } from './cleanup-phase';

describe('cleanup phase records', () => {
  const barrage = createAbilityModifier(
    P1,
    'gunner',
    findCommander(TEST_CONFIG, 'gunner').ability,
    NO_ABILITY_TARGET,
    1,
  );
  const state = createTestState({
    players: [{ score: 6 }, {}, {}, {}],
    zones: {
      A1: { owner: P1, units: { line: 2, artillery: 1 } },
      A2: { owner: P1, units: { cavalry: 1 } },
      B2: { owner: P1 },
      A3: { owner: P2, units: { line: 1 } },
      C1: { owner: P3 },
    },
    modifiers: [barrage, createUpgradeModifier(P1, 'drill')],
  });
  const result = applyCleanupPhase(
    startResolution(state),
    createTestContext(state, [], TEST_CONFIG),
  );

  it('logs modifiers that wear off', () => {
    expect(eventsOfType(result.replayLog, 'ModifierExpired')).toEqual([
      { type: 'ModifierExpired', turnNumber: 1, modifierId: barrage.id },
    ]);
  });

  it('records the night’s public standings last, after eliminations', () => {
    expect(result.replayLog.at(-1)).toEqual({
      type: 'StandingsRecorded',
      turnNumber: 1,
      standings: [
        {
          playerId: P1,
          units: 4,
          zonesOwned: 3,
          citiesHeld: 2,
          score: 6,
          eliminated: false,
        },
        {
          playerId: P2,
          units: 1,
          zonesOwned: 1,
          citiesHeld: 1,
          score: 0,
          eliminated: false,
        },
        {
          playerId: P3,
          units: 0,
          zonesOwned: 1,
          citiesHeld: 1,
          score: 0,
          eliminated: false,
        },
        {
          playerId: P4,
          units: 0,
          zonesOwned: 0,
          citiesHeld: 0,
          score: 0,
          eliminated: true,
        },
      ],
    });
  });
});
