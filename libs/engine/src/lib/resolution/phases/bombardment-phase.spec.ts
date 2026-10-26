import type { PlayerOrders } from '../../orders/orders';
import {
  createAbilityModifier,
  createCommanderPassiveModifier,
} from '../../modifiers/active-modifiers';
import { findCommander } from '../../config/content-queries';
import { NO_ABILITY_TARGET } from '../../modifiers/ability-target';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import type { TestStateOptions } from '../../../testing/test-state';
import {
  createTestState,
  ownedZoneTarget,
  P1,
  P2,
  P3,
  supportOrder,
  zoneId,
} from '../../../testing/test-state';
import { findZone } from '../../state/match-state-queries';
import type { ResolutionState } from '../resolution-state';
import { applyBombardmentPhase } from './bombardment-phase';

function bombard(
  options: TestStateOptions,
  submissions: readonly PlayerOrders[],
): ResolutionState {
  const state = createTestState(options);
  return applyBombardmentPhase(
    startResolution(state),
    createTestContext(state, submissions, TEST_CONFIG),
  );
}

function armiesIn(
  resolution: ResolutionState,
  zone: string,
): readonly string[] {
  return findZone(resolution.match, zoneId(zone)).armies.map(
    (army) =>
      `${army.playerId}:${army.units.line}L${army.units.cavalry}C${army.units.skirmishers}S${army.units.artillery}A`,
  );
}

/** p1 defends B2; p2 and p3 attack it. Artillery stands in A2 (p1), B1 (p2) and B3 (p3). */
const BATTLE_IN_B2 = {
  A2: { owner: P1, units: { artillery: 3 } },
  B1: { owner: P2, units: { artillery: 2 } },
  B3: { owner: P3, units: { artillery: 1 } },
  B2: {
    owner: P1,
    armies: [
      { playerId: P1, units: { line: 2, skirmishers: 1 } },
      { playerId: P2, units: { line: 5 } },
      { playerId: P3, units: { cavalry: 5 } },
    ],
  },
};

describe('bombardment phase', () => {
  it('lets an attacker’s guns hit the defender in removal order', () => {
    const result = bombard({ zones: BATTLE_IN_B2 }, [
      { playerId: P2, orders: [supportOrder('B1', 'B2', 2)] },
    ]);
    expect(armiesIn(result, 'B2')).toEqual([
      'p1:0L0C1S0A',
      'p2:5L0C0S0A',
      'p3:0L5C0S0A',
    ]);
    expect(eventsOfType(result.replayLog, 'Bombardment')).toEqual([
      {
        type: 'Bombardment',
        turnNumber: 1,
        playerId: P2,
        fromZoneId: 'B1',
        targetZoneId: 'B2',
        artillery: 2,
        hits: [
          { playerId: P1, unitType: 'line' },
          { playerId: P1, unitType: 'line' },
        ],
        blockedHits: 0,
        wastedHits: 0,
      },
    ]);
  });

  it('wastes hits on a destroyed defender instead of switching targets', () => {
    const result = bombard({ zones: BATTLE_IN_B2 }, [
      { playerId: P2, orders: [supportOrder('B1', 'B2', 2)] },
      { playerId: P3, orders: [supportOrder('B3', 'B2', 1)] },
    ]);
    expect(armiesIn(result, 'B2')).toEqual(['p2:5L0C0S0A', 'p3:0L5C0S0A']);
    expect(
      eventsOfType(result.replayLog, 'Bombardment').map((event) => [
        event.hits.length,
        event.wastedHits,
      ]),
    ).toEqual([
      [2, 0],
      [1, 0],
    ]);
  });

  it('aims each of the defender’s hits at the attacker that is largest at that moment', () => {
    const result = bombard({ zones: BATTLE_IN_B2 }, [
      { playerId: P1, orders: [supportOrder('A2', 'B2', 3)] },
    ]);
    // 5 vs 5: p2 (lower seat), then p3 (now larger), then p2 again (tie, lower seat)
    expect(eventsOfType(result.replayLog, 'Bombardment')[0]?.hits).toEqual([
      { playerId: P2, unitType: 'line' },
      { playerId: P3, unitType: 'cavalry' },
      { playerId: P2, unitType: 'line' },
    ]);
  });

  it('hits the largest enemy army in a battle with no defender', () => {
    const result = bombard(
      {
        zones: {
          A2: { owner: P1, units: { artillery: 1 } },
          B2: {
            armies: [
              { playerId: P1, units: { line: 1 } },
              { playerId: P2, units: { line: 2 } },
              { playerId: P3, units: { line: 4 } },
            ],
          },
        },
      },
      [{ playerId: P1, orders: [supportOrder('A2', 'B2', 1)] }],
    );
    expect(armiesIn(result, 'B2')).toEqual([
      'p1:1L0C0S0A',
      'p2:2L0C0S0A',
      'p3:3L0C0S0A',
    ]);
  });

  it('wastes hits when every enemy is gone', () => {
    const result = bombard(
      {
        zones: {
          A2: { owner: P1, units: { artillery: 3 } },
          B2: {
            armies: [
              { playerId: P1, units: { line: 1 } },
              { playerId: P2, units: { line: 1 } },
            ],
          },
        },
      },
      [{ playerId: P1, orders: [supportOrder('A2', 'B2', 3)] }],
    );
    expect(eventsOfType(result.replayLog, 'Bombardment')[0]).toMatchObject({
      hits: [{ playerId: P2 }],
      wastedHits: 2,
    });
    expect(armiesIn(result, 'B2')).toEqual(['p1:1L0C0S0A']);
  });

  it('multiplies hits by hits per artillery and volleys', () => {
    const barrage = createAbilityModifier(
      P2,
      'gunner',
      findCommander(TEST_CONFIG, 'gunner').ability,
      NO_ABILITY_TARGET,
      1,
    );
    const result = bombard(
      {
        zones: {
          ...BATTLE_IN_B2,
          B2: {
            ...BATTLE_IN_B2.B2,
            armies: [
              { playerId: P1, units: { line: 9 } },
              { playerId: P2, units: { line: 1 } },
            ],
          },
        },
        modifiers: [createCommanderPassiveModifier(P2, 'gunner'), barrage],
      },
      [{ playerId: P2, orders: [supportOrder('B1', 'B2', 2)] }],
    );
    // 2 guns × 2 hits × 2 volleys
    expect(armiesIn(result, 'B2')).toEqual(['p1:1L0C0S0A', 'p2:1L0C0S0A']);
  });

  it('blocks enemy hits on a shielded army, but not that army’s own guns', () => {
    const hold = createAbilityModifier(
      P1,
      'warden',
      findCommander(TEST_CONFIG, 'warden').ability,
      ownedZoneTarget('B2'),
      1,
    );
    const result = bombard({ zones: BATTLE_IN_B2, modifiers: [hold] }, [
      { playerId: P1, orders: [supportOrder('A2', 'B2', 1)] },
      { playerId: P2, orders: [supportOrder('B1', 'B2', 2)] },
    ]);
    expect(
      eventsOfType(result.replayLog, 'Bombardment').map((event) => [
        event.playerId,
        event.hits.length,
        event.blockedHits,
      ]),
    ).toEqual([
      [P1, 1, 0],
      [P2, 0, 2],
    ]);
  });

  it('fires only into battles its owner takes part in', () => {
    const result = bombard(
      {
        zones: {
          A2: { owner: P1, units: { artillery: 1 } },
          B1: { owner: P1, units: { artillery: 1 } },
          B2: {
            armies: [
              { playerId: P2, units: { line: 1 } },
              { playerId: P3, units: { line: 1 } },
            ],
          },
          C1: { owner: P1, units: { line: 1 } },
        },
      },
      [
        {
          playerId: P1,
          orders: [supportOrder('A2', 'B2', 1), supportOrder('B1', 'C1', 1)],
        },
      ],
    );
    expect(eventsOfType(result.replayLog, 'Bombardment')).toEqual([]);
    expect(armiesIn(result, 'B2')).toEqual(['p2:1L0C0S0A', 'p3:1L0C0S0A']);
  });

  it('fires with everything present at the start, even artillery destroyed before its turn', () => {
    // p1 (seat 1) fires first and destroys p2's lone gun in A2; that gun still fires into B2.
    const result = bombard(
      {
        zones: {
          A1: { owner: P1, units: { artillery: 1 } },
          A2: {
            owner: P2,
            armies: [
              { playerId: P1, units: { line: 1 } },
              { playerId: P2, units: { artillery: 1 } },
            ],
          },
          B2: {
            armies: [
              { playerId: P2, units: { line: 1 } },
              { playerId: P3, units: { line: 1 } },
            ],
          },
        },
      },
      [
        { playerId: P1, orders: [supportOrder('A1', 'A2', 1)] },
        { playerId: P2, orders: [supportOrder('A2', 'B2', 1)] },
      ],
    );
    expect(armiesIn(result, 'A2')).toEqual(['p1:1L0C0S0A']);
    expect(armiesIn(result, 'B2')).toEqual(['p2:1L0C0S0A']);
    expect(
      eventsOfType(result.replayLog, 'Bombardment').map((event) => [
        event.playerId,
        event.hits,
      ]),
    ).toEqual([
      [P1, [{ playerId: P2, unitType: 'artillery' }]],
      [P2, [{ playerId: P3, unitType: 'line' }]],
    ]);
  });
});
