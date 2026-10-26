import {
  createAbilityModifier,
  createCommanderPassiveModifier,
  createUpgradeModifier,
} from '../modifiers/active-modifiers';
import { findCommander } from '../config/content-queries';
import { NO_ABILITY_TARGET } from '../modifiers/ability-target';
import { TEST_CONFIG } from '../../testing/test-config';
import {
  createTestState,
  ownedZoneTarget,
  P1,
  P2,
  P3,
  units,
  zoneId,
} from '../../testing/test-state';
import type { TestStateOptions } from '../../testing/test-state';
import { findZone } from '../state/match-state-queries';
import type { BattleSide } from '../combat/battle';
import { requirePresent } from '../core/engine-error';
import type { PlayerId } from '../core/ids';
import type { ActiveModifier } from '../modifiers/active-modifiers';
import { createFieldBattleSide, createZoneBattleSides } from './battle-sides';

function sideFor(sides: readonly BattleSide[], playerId: PlayerId): BattleSide {
  return requirePresent(
    sides.find((side) => side.playerId === playerId),
    `side of ${playerId}`,
  );
}

function sidesInB2(
  options: TestStateOptions,
): ReturnType<typeof createZoneBattleSides> {
  const state = createTestState(options);
  return createZoneBattleSides(
    state,
    TEST_CONFIG,
    findZone(state, zoneId('B2')),
  );
}

const CONTESTED_B2 = {
  B2: {
    owner: P1,
    armies: [
      { playerId: P1, units: { line: 2 } },
      { playerId: P2, units: { cavalry: 3 } },
      { playerId: P3, units: { line: 1 } },
    ],
  },
};

const charge = (playerId: typeof P2): ActiveModifier =>
  createAbilityModifier(
    playerId,
    'charger',
    findCommander(TEST_CONFIG, 'charger').ability,
    NO_ABILITY_TARGET,
    1,
  );

describe('battle sides', () => {
  it('makes the owner present in the zone the defender with the base defender bonus', () => {
    const sides = sidesInB2({ zones: CONTESTED_B2 });
    expect(
      sides.map((side) => [side.playerId, side.role, side.bonuses]),
    ).toEqual([
      [P1, 'defender', [{ source: 'defender', value: 0.25 }]],
      [P2, 'attacker', []],
      [P3, 'attacker', []],
    ]);
  });

  it('adds strength bonuses for the role a side fights in', () => {
    const sides = sidesInB2({
      zones: CONTESTED_B2,
      modifiers: [
        createCommanderPassiveModifier(P1, 'warden'),
        createCommanderPassiveModifier(P2, 'warden'),
      ],
    });
    expect(sideFor(sides, P1).bonuses).toEqual([
      { source: 'defender', value: 0.25 },
      { source: 'passive:warden:p1', value: 0.1 },
    ]);
    expect(sideFor(sides, P2).bonuses).toEqual([]);
  });

  it('uses zone-targeted parameters of the battle zone', () => {
    const hold = createAbilityModifier(
      P1,
      'warden',
      findCommander(TEST_CONFIG, 'warden').ability,
      ownedZoneTarget('B2'),
      1,
    );
    expect(
      sideFor(sidesInB2({ zones: CONTESTED_B2, modifiers: [hold] }), P1)
        .bonuses,
    ).toEqual([{ source: 'defender', value: 0.5 }]);
  });

  it('cancels every defending bonus when an attacker charges with a suppressor type present', () => {
    const sides = sidesInB2({
      zones: CONTESTED_B2,
      modifiers: [charge(P2), createCommanderPassiveModifier(P1, 'warden')],
    });
    expect(sideFor(sides, P1).bonuses).toEqual([]);
  });

  it('keeps defending bonuses when the charging attacker has no unit of the suppressor type', () => {
    expect(
      sideFor(sidesInB2({ zones: CONTESTED_B2, modifiers: [charge(P3)] }), P1)
        .bonuses,
    ).toEqual([{ source: 'defender', value: 0.25 }]);
  });

  it('builds combat profiles from effective parameters', () => {
    const sides = sidesInB2({
      zones: CONTESTED_B2,
      modifiers: [createUpgradeModifier(P1, 'drill')],
    });
    expect(sideFor(sides, P1).profile.vulnerability.line.skirmishers).toBe(0.5);
    expect(sideFor(sides, P2).profile.vulnerability.line.skirmishers).toBe(1);
  });

  it('builds head-on clash sides as attackers with attacking bonuses', () => {
    const config = {
      ...TEST_CONFIG,
      upgrades: [
        ...TEST_CONFIG.upgrades,
        {
          id: 'fury',
          effect: {
            priority: 0,
            patches: [
              {
                kind: 'addStrengthBonus' as const,
                role: 'attacker' as const,
                value: 0.1,
              },
            ],
            phaseSteps: [],
          },
        },
      ],
    };
    const state = createTestState({
      modifiers: [createUpgradeModifier(P1, 'fury')],
    });
    expect(
      createFieldBattleSide(state, config, P1, units({ line: 1 })),
    ).toMatchObject({
      role: 'attacker',
      bonuses: [{ source: 'upgrade:fury:p1', value: 0.1 }],
    });
  });
});
