import { EngineContractError } from '../core/engine-error';
import { TEST_CONFIG } from '../../testing/test-config';
import {
  createTestState,
  P1,
  P2,
  P3,
  ownedZoneTarget,
  reinforcementTarget,
} from '../../testing/test-state';
import type { ActiveModifier } from './active-modifiers';
import {
  activeModifiersInOrder,
  appliesToPlayer,
  createAbilityModifier,
  createCommanderPassiveModifier,
  createEventModifier,
  createUpgradeModifier,
  findModifierEffect,
  isModifierActive,
  isModifierExpiredAfter,
  seatOfModifier,
  targetZoneOf,
} from './active-modifiers';
import { NO_ABILITY_TARGET } from './ability-target';
import { findCommander } from '../config/content-queries';

const blightAbility = findCommander(TEST_CONFIG, 'blight').ability;

describe('active modifiers', () => {
  it('looks up the effect of every kind of source', () => {
    expect(
      findModifierEffect(TEST_CONFIG, { kind: 'upgrade', upgradeId: 'retreat' })
        .patches,
    ).toHaveLength(1);
    expect(
      findModifierEffect(TEST_CONFIG, {
        kind: 'commanderPassive',
        commanderId: 'gunner',
      }).patches,
    ).toHaveLength(1);
    expect(
      findModifierEffect(TEST_CONFIG, {
        kind: 'commanderAbility',
        commanderId: 'marshal',
      }).phaseSteps,
    ).toHaveLength(1);
    expect(
      findModifierEffect(TEST_CONFIG, { kind: 'event', eventId: 'truce' })
        .patches,
    ).toHaveLength(1);
    expect(() =>
      findModifierEffect(TEST_CONFIG, { kind: 'event', eventId: 'comet' }),
    ).toThrow(new EngineContractError('Missing event comet'));
  });

  it('creates modifiers with stable ids, owners, scopes and durations', () => {
    expect(createUpgradeModifier(P1, 'drill')).toEqual({
      id: 'upgrade:drill:p1',
      ownerId: P1,
      source: { kind: 'upgrade', upgradeId: 'drill' },
      scope: { kind: 'player', playerId: P1 },
      duration: { kind: 'permanent' },
      target: NO_ABILITY_TARGET,
    });
    expect(createCommanderPassiveModifier(P2, 'warden').id).toBe(
      'passive:warden:p2',
    );
    expect(createEventModifier('truce', 3)).toEqual({
      id: 'event:truce:3',
      ownerId: null,
      source: { kind: 'event', eventId: 'truce' },
      scope: { kind: 'global' },
      duration: { kind: 'nights', fromTurn: 3, untilTurn: 3 },
      target: NO_ABILITY_TARGET,
    });
  });

  it('scopes "everyone" abilities globally and spans their nights', () => {
    const scorch = createAbilityModifier(
      P3,
      'blight',
      blightAbility,
      ownedZoneTarget('C1'),
      2,
    );
    expect(scorch.scope).toEqual({ kind: 'global' });
    expect(scorch.ownerId).toBe(P3);
    expect(scorch.duration).toEqual({
      kind: 'nights',
      fromTurn: 2,
      untilTurn: 3,
    });
    const forward = createAbilityModifier(
      P1,
      'marshal',
      findCommander(TEST_CONFIG, 'marshal').ability,
      NO_ABILITY_TARGET,
      4,
    );
    expect(forward.scope).toEqual({ kind: 'player', playerId: P1 });
  });

  it.each([
    { turn: 1, active: false, expiredAfter: false },
    { turn: 2, active: true, expiredAfter: false },
    { turn: 3, active: true, expiredAfter: true },
    { turn: 4, active: false, expiredAfter: true },
  ])(
    'a two-night modifier from turn 2 on turn $turn: active $active',
    ({ turn, active, expiredAfter }) => {
      const scorch = createAbilityModifier(
        P3,
        'blight',
        blightAbility,
        ownedZoneTarget('C1'),
        2,
      );
      expect(isModifierActive(scorch, turn)).toBe(active);
      expect(isModifierExpiredAfter(scorch, turn)).toBe(expiredAfter);
    },
  );

  it('never expires permanent modifiers', () => {
    expect(isModifierActive(createUpgradeModifier(P1, 'drill'), 99)).toBe(true);
    expect(isModifierExpiredAfter(createUpgradeModifier(P1, 'drill'), 99)).toBe(
      false,
    );
  });

  it('applies player modifiers to their player only, and global ones to everyone', () => {
    expect(appliesToPlayer(createUpgradeModifier(P1, 'drill'), P1)).toBe(true);
    expect(appliesToPlayer(createUpgradeModifier(P1, 'drill'), P2)).toBe(false);
    expect(appliesToPlayer(createEventModifier('truce', 1), P2)).toBe(true);
  });

  it('knows the zone an ability targets', () => {
    expect(
      targetZoneOf(
        createAbilityModifier(
          P3,
          'blight',
          blightAbility,
          ownedZoneTarget('C1'),
          1,
        ),
      ),
    ).toBe('C1');
    expect(targetZoneOf(createUpgradeModifier(P1, 'drill'))).toBeNull();
    expect(
      targetZoneOf(
        createAbilityModifier(
          P1,
          'marshal',
          blightAbility,
          reinforcementTarget('A1', 'A2', { line: 1 }),
          1,
        ),
      ),
    ).toBeNull();
  });

  it('orders active modifiers by priority, then owner seat (events first), then id', () => {
    const modifiers: readonly ActiveModifier[] = [
      createUpgradeModifier(P2, 'retreat'),
      createUpgradeModifier(P1, 'retreat'),
      createUpgradeModifier(P1, 'drill'),
      createEventModifier('truce', 1),
      createEventModifier('levy', 2),
    ];
    const state = createTestState({ modifiers });
    expect(seatOfModifier(state, modifiers[0] as ActiveModifier)).toBe(2);
    expect(seatOfModifier(state, modifiers[3] as ActiveModifier)).toBe(0);
    expect(
      activeModifiersInOrder(state, TEST_CONFIG).map((modifier) => modifier.id),
    ).toEqual([
      'event:truce:1',
      'upgrade:drill:p1',
      'upgrade:retreat:p1',
      'upgrade:retreat:p2',
    ]);
  });
});
