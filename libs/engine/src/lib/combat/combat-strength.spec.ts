import { battleSide } from '../../testing/test-battle';
import { P1, P2, P3 } from '../../testing/test-state';
import { TEST_VULNERABILITY } from '../../testing/test-config';
import { computeStrength } from './combat-strength';

describe('computeStrength', () => {
  it.each([
    {
      matchup: 'line into cavalry (counter)',
      own: { line: 3 },
      enemy: { cavalry: 3 },
      expected: 6,
    },
    {
      matchup: 'cavalry into skirmishers (counter)',
      own: { cavalry: 3 },
      enemy: { skirmishers: 3 },
      expected: 6,
    },
    {
      matchup: 'skirmishers into line (counter)',
      own: { skirmishers: 3 },
      enemy: { line: 3 },
      expected: 6,
    },
    {
      matchup: 'cavalry into line (countered)',
      own: { cavalry: 3 },
      enemy: { line: 3 },
      expected: 3,
    },
    {
      matchup: 'skirmishers into cavalry (countered)',
      own: { skirmishers: 3 },
      enemy: { cavalry: 3 },
      expected: 3,
    },
    {
      matchup: 'line into skirmishers (countered)',
      own: { line: 3 },
      enemy: { skirmishers: 3 },
      expected: 3,
    },
    {
      matchup: 'line into line (mirror)',
      own: { line: 3 },
      enemy: { line: 1 },
      expected: 3,
    },
    {
      matchup: 'artillery into anything (half strength)',
      own: { artillery: 4 },
      enemy: { cavalry: 1 },
      expected: 2,
    },
    {
      matchup: 'anything into artillery (neutral)',
      own: { cavalry: 2 },
      enemy: { artillery: 5 },
      expected: 2,
    },
    {
      matchup: 'a mixed army against a mixed army',
      own: { line: 2, cavalry: 2 },
      enemy: { skirmishers: 2, cavalry: 1 },
      // line: 2·(2/3·1 + 1/3·2) = 8/3; cavalry: 2·(2/3·2 + 1/3·1) = 10/3
      expected: 6,
    },
  ])('rates $matchup', ({ own, enemy, expected }) => {
    const strength = computeStrength(battleSide(P1, 'attacker', own), [
      battleSide(P2, 'attacker', enemy),
    ]);
    expect(strength.totalStrength).toBeCloseTo(expected, 9);
    expect(strength.baseStrength).toBeCloseTo(expected, 9);
  });

  it('applies bonuses on top of the base strength', () => {
    const strength = computeStrength(battleSide(P1, 'defender', { line: 2 }), [
      battleSide(P2, 'attacker', { cavalry: 4 }),
    ]);
    expect(strength.baseStrength).toBe(4);
    expect(strength.bonuses).toEqual([{ source: 'defender', value: 0.25 }]);
    expect(strength.totalStrength).toBe(5);
  });

  it('rates a side against the union of all its enemies', () => {
    const strength = computeStrength(battleSide(P1, 'attacker', { line: 4 }), [
      battleSide(P2, 'attacker', { cavalry: 1 }),
      battleSide(P3, 'defender', { skirmishers: 3 }),
    ]);
    // 4 line · (1/4 · 2 + 3/4 · 1)
    expect(strength.totalStrength).toBe(5);
  });

  it('uses each enemy’s own vulnerability matrix', () => {
    const lancers = {
      vulnerability: {
        ...TEST_VULNERABILITY,
        cavalry: { ...TEST_VULNERABILITY.cavalry, line: 0.5 },
      },
    };
    const strength = computeStrength(battleSide(P1, 'attacker', { line: 2 }), [
      battleSide(P2, 'attacker', { cavalry: 1 }, lancers),
      battleSide(P3, 'attacker', { cavalry: 1 }),
    ]);
    // 2 line · (1/2 · 2 · 0.5 + 1/2 · 2 · 1)
    expect(strength.totalStrength).toBe(3);
  });

  it('breaks strength down by own type and enemy target type', () => {
    const strength = computeStrength(
      battleSide(P1, 'attacker', { skirmishers: 2, artillery: 1 }),
      [battleSide(P2, 'defender', { line: 1, cavalry: 1 })],
    );
    expect(strength.contributions).toEqual([
      { unitType: 'skirmishers', targetType: 'line', value: 2 },
      { unitType: 'skirmishers', targetType: 'cavalry', value: 1 },
      { unitType: 'artillery', targetType: 'line', value: 0.25 },
      { unitType: 'artillery', targetType: 'cavalry', value: 0.25 },
    ]);
    expect(strength.totalStrength).toBe(3.5);
  });
});
