import type { MatchConfig } from '../config/match-config';
import { TEST_CONFIG } from '../../testing/test-config';
import { NO_EFFECT } from '../../testing/test-content';
import {
  createTestState,
  ownedZoneTarget,
  P1,
  P2,
  zoneId,
} from '../../testing/test-state';
import { findCommander } from '../config/content-queries';
import {
  createAbilityModifier,
  createCommanderPassiveModifier,
  createEventModifier,
  createUpgradeModifier,
} from './active-modifiers';
import { effectiveParameters } from './effective-parameters';
import { baseParameters } from './parameters';

describe('effectiveParameters', () => {
  it('returns the config’s base values when nothing is in play', () => {
    expect(
      effectiveParameters(createTestState({}), TEST_CONFIG, P1, null),
    ).toEqual(baseParameters(TEST_CONFIG));
  });

  it('applies a player’s modifiers to that player only, and events to everyone', () => {
    const state = createTestState({
      modifiers: [
        createUpgradeModifier(P1, 'retreat'),
        createEventModifier('truce', 1),
      ],
    });
    expect(
      effectiveParameters(state, TEST_CONFIG, P1, null).orderlyRetreat,
    ).toBe(true);
    expect(
      effectiveParameters(state, TEST_CONFIG, P2, null).orderlyRetreat,
    ).toBe(false);
    expect(
      effectiveParameters(state, TEST_CONFIG, P2, null)
        .foreignAndContestedMovesBounce,
    ).toBe(true);
  });

  it('ignores modifiers that are not active this turn', () => {
    const state = createTestState({
      turnNumber: 2,
      modifiers: [createEventModifier('truce', 3)],
    });
    expect(
      effectiveParameters(state, TEST_CONFIG, P1, null)
        .foreignAndContestedMovesBounce,
    ).toBe(false);
  });

  it('applies zone-targeted patches only in the targeted zone', () => {
    const hold = createAbilityModifier(
      P1,
      'warden',
      findCommander(TEST_CONFIG, 'warden').ability,
      ownedZoneTarget('A1'),
      1,
    );
    const state = createTestState({ modifiers: [hold] });
    expect(
      effectiveParameters(state, TEST_CONFIG, P1, zoneId('A1')),
    ).toMatchObject({
      shieldedFromEnemyBombardment: true,
      defenderBonus: 0.5,
    });
    expect(
      effectiveParameters(state, TEST_CONFIG, P1, zoneId('A2'))
        .shieldedFromEnemyBombardment,
    ).toBe(false);
    expect(
      effectiveParameters(state, TEST_CONFIG, P1, null).defenderBonus,
    ).toBe(0.25);
  });

  it('applies patches in modifier priority order, so the outcome never depends on insertion order', () => {
    const config: MatchConfig = {
      ...TEST_CONFIG,
      upgrades: [
        {
          id: 'set-first',
          effect: {
            ...NO_EFFECT,
            priority: 1,
            patches: [
              {
                kind: 'number',
                parameter: 'upgradeCost',
                operation: 'set',
                value: 10,
              },
            ],
          },
        },
        {
          id: 'then-double',
          effect: {
            ...NO_EFFECT,
            priority: 2,
            patches: [
              {
                kind: 'number',
                parameter: 'upgradeCost',
                operation: 'multiply',
                value: 2,
              },
            ],
          },
        },
      ],
    };
    const forwards = createTestState({
      modifiers: [
        createUpgradeModifier(P1, 'set-first'),
        createUpgradeModifier(P1, 'then-double'),
      ],
    });
    const backwards = createTestState({
      modifiers: [
        createUpgradeModifier(P1, 'then-double'),
        createUpgradeModifier(P1, 'set-first'),
      ],
    });
    expect(effectiveParameters(forwards, config, P1, null).upgradeCost).toBe(
      20,
    );
    expect(effectiveParameters(backwards, config, P1, null).upgradeCost).toBe(
      20,
    );
  });

  it('includes commander passives', () => {
    const state = createTestState({
      modifiers: [createCommanderPassiveModifier(P2, 'gunner')],
    });
    expect(
      effectiveParameters(state, TEST_CONFIG, P2, null)
        .bombardmentHitsPerArtillery,
    ).toBe(2);
  });
});
