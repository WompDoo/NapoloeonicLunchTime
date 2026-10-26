import { EngineContractError } from '../core/engine-error';
import { NO_UNITS } from '../core/unit-counts';
import type { UnitCounts } from '../core/unit-types';
import { battleSide } from '../../testing/test-battle';
import { sideOf } from '../../testing/replay-queries';
import { TEST_COMBAT_RULES } from '../../testing/test-config';
import { P1, P2, P3, units } from '../../testing/test-state';
import type { BattleSide } from './battle';
import { areStrengthsEqual, resolveBattle } from './resolve-battle';

interface BattleCase {
  readonly name: string;
  readonly sides: readonly BattleSide[];
  readonly winner: string | null;
  readonly remaining: readonly Partial<UnitCounts>[];
}

function expectBattle({ sides, winner, remaining }: BattleCase): void {
  const result = resolveBattle(sides, TEST_COMBAT_RULES);
  expect(result.outcome).toEqual(
    winner === null
      ? { kind: 'mutualDestruction' }
      : { kind: 'victory', winnerId: winner },
  );
  expect(result.sides.map((side) => side.unitsRemaining)).toEqual(
    remaining.map(units),
  );
}

describe('resolveBattle', () => {
  describe('counters versus numbers (spec table)', () => {
    it.each<BattleCase>([
      {
        name: '4 cavalry into 2 defending line: line holds',
        sides: [
          battleSide(P1, 'attacker', { cavalry: 4 }),
          battleSide(P2, 'defender', { line: 2 }),
        ],
        winner: P2,
        // losses ceil(0.5 · 4) = 2, capped so the winner keeps 1
        remaining: [{}, { line: 1 }],
      },
      {
        name: '6 cavalry into 2 defending line: cavalry wins',
        sides: [
          battleSide(P1, 'attacker', { cavalry: 6 }),
          battleSide(P2, 'defender', { line: 2 }),
        ],
        winner: P1,
        // 6 vs 5, losses ceil(0.5 · 5) = 3
        remaining: [{ cavalry: 3 }, {}],
      },
    ])('$name', expectBattle);
  });

  describe('the triangle', () => {
    it.each<BattleCase>([
      {
        name: 'skirmishers beat line even into the defender bonus',
        sides: [
          battleSide(P1, 'attacker', { skirmishers: 3 }),
          battleSide(P2, 'defender', { line: 3 }),
        ],
        winner: P1,
        // 6 vs 3.75, losses ceil(1.875) = 2
        remaining: [{ skirmishers: 1 }, {}],
      },
      {
        name: 'cavalry beats skirmishers',
        sides: [
          battleSide(P1, 'attacker', { cavalry: 3 }),
          battleSide(P2, 'defender', { skirmishers: 3 }),
        ],
        winner: P1,
        remaining: [{ cavalry: 1 }, {}],
      },
      {
        name: 'line beats cavalry',
        sides: [
          battleSide(P1, 'attacker', { line: 3 }),
          battleSide(P2, 'defender', { cavalry: 3 }),
        ],
        winner: P1,
        remaining: [{ line: 1 }, {}],
      },
      {
        name: 'mirror matchups come down to numbers and the defender bonus',
        sides: [
          battleSide(P1, 'attacker', { line: 4 }),
          battleSide(P2, 'defender', { line: 3 }),
        ],
        winner: P1,
        // 4 vs 3.75, losses ceil(1.875) = 2
        remaining: [{ line: 2 }, {}],
      },
      {
        name: 'artillery is weak in direct combat but not useless',
        sides: [
          battleSide(P1, 'attacker', { artillery: 4 }),
          battleSide(P2, 'defender', { line: 1 }),
        ],
        winner: P1,
        // 2 vs 1.25, losses ceil(0.625) = 1
        remaining: [{ artillery: 3 }, {}],
      },
      {
        name: 'losers lose their artillery too',
        sides: [
          battleSide(P1, 'attacker', { line: 6 }),
          battleSide(P2, 'defender', { line: 1, artillery: 2 }),
        ],
        winner: P1,
        // 6 vs (1 + 1) · 1.25 = 2.5, losses ceil(1.25) = 2
        remaining: [{ line: 4 }, {}],
      },
    ])('$name', expectBattle);
  });

  describe('mixed armies', () => {
    it.each<BattleCase>([
      {
        name: 'mixed attacker beats mixed defender and loses units in removal order',
        sides: [
          battleSide(P1, 'attacker', { line: 2, cavalry: 2 }),
          battleSide(P2, 'defender', { skirmishers: 2, cavalry: 1 }),
        ],
        winner: P1,
        // 6 vs (3 + 1) · 1.25 = 5, losses ceil(2.5) = 3: line (tie), cavalry, line
        remaining: [{ cavalry: 1 }, {}],
      },
      {
        name: 'a defender mixing in the counter holds',
        sides: [
          battleSide(P1, 'attacker', { cavalry: 4 }),
          battleSide(P2, 'defender', { line: 2, skirmishers: 1 }),
        ],
        winner: P2,
        // cavalry 4 · (2/3 · 1 + 1/3 · 2) = 16/3 ≈ 5.33; defender (2 · 2 + 1 · 1) · 1.25 = 6.25
        // losses ceil(8/3) = 3, capped at 2: line (most numerous), then line again (tie-break)
        remaining: [{}, { skirmishers: 1 }],
      },
    ])('$name', expectBattle);
  });

  describe('ties', () => {
    it.each<BattleCase>([
      {
        name: 'the defender wins a tie',
        sides: [
          battleSide(P1, 'attacker', { line: 5 }),
          battleSide(P2, 'defender', { line: 4 }),
        ],
        winner: P2,
        // 5 vs 5, losses ceil(2.5) = 3
        remaining: [{}, { line: 1 }],
      },
      {
        name: 'a tie with no defender destroys both sides',
        sides: [
          battleSide(P1, 'attacker', { line: 3 }),
          battleSide(P2, 'attacker', { line: 3 }),
        ],
        winner: null,
        remaining: [{}, {}],
      },
      {
        name: 'a three-way tie with no defender destroys everyone',
        sides: [
          battleSide(P1, 'attacker', { line: 2 }),
          battleSide(P2, 'attacker', { cavalry: 2 }),
          battleSide(P3, 'attacker', { skirmishers: 2 }),
        ],
        winner: null,
        remaining: [{}, {}, {}],
      },
      {
        name: 'tied attackers above a weaker defender: everyone is destroyed',
        sides: [
          battleSide(P1, 'attacker', { line: 5 }),
          battleSide(P2, 'attacker', { line: 5 }),
          battleSide(P3, 'defender', { line: 2 }),
        ],
        winner: null,
        remaining: [{}, {}, {}],
      },
      {
        name: 'a defender tied with the strongest attacker wins the multi-way battle',
        sides: [
          battleSide(P1, 'attacker', { line: 5 }),
          battleSide(P2, 'attacker', { line: 3 }),
          battleSide(P3, 'defender', { line: 4 }),
        ],
        winner: P3,
        // 5 vs 3 vs 5, losses ceil(0.5 · 5) = 3
        remaining: [{}, {}, { line: 1 }],
      },
    ])('$name', expectBattle);
  });

  describe('multi-way battles', () => {
    it.each<BattleCase>([
      {
        name: 'the highest strength wins and pays for the second highest',
        sides: [
          battleSide(P1, 'attacker', { line: 6 }),
          battleSide(P2, 'attacker', { cavalry: 2 }),
          battleSide(P3, 'defender', { skirmishers: 2 }),
        ],
        // p1: 6 · (1/2 · 2 + 1/2 · 1) = 9; p2: 2 · (6/8 · 1 + 2/8 · 2) = 2.5; p3: 2 · (6/8 · 2 + 2/8 · 1) · 1.25 = 4.375
        winner: P1,
        remaining: [{ line: 3 }, {}, {}],
      },
    ])('$name', expectBattle);
  });

  it('ignores floating-point noise when rounding the winner’s losses', () => {
    // 0.1 · 30 is 3.0000000000000004 in floating point; the winner must lose 3, not 4.
    const sides = [
      battleSide(P1, 'attacker', { line: 30 }),
      battleSide(P2, 'defender', { skirmishers: 20 }, { winnerLossRatio: 0.1 }),
    ];
    const result = resolveBattle(sides, TEST_COMBAT_RULES);
    expect(sideOf(result, P2).unitsLost).toEqual(units({ skirmishers: 3 }));
  });

  it('treats strengths within rounding noise as equal', () => {
    expect(areStrengthsEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(areStrengthsEqual(1, 1.001)).toBe(false);
  });

  it('never gives a winner negative losses', () => {
    const sides = [
      battleSide(P1, 'attacker', { line: 1 }, { offense: zeroOffense() }),
      battleSide(P2, 'defender', { line: 2 }),
    ];
    const result = resolveBattle(sides, TEST_COMBAT_RULES);
    expect(sideOf(result, P2).unitsLost).toEqual(NO_UNITS);
    expect(Object.is(sideOf(result, P2).unitsLost.line, 0)).toBe(true);
  });

  it('reports units before, lost and remaining with the strength breakdown', () => {
    const result = resolveBattle(
      [
        battleSide(P1, 'attacker', { cavalry: 6 }),
        battleSide(P2, 'defender', { line: 2 }),
      ],
      TEST_COMBAT_RULES,
    );
    expect(sideOf(result, P1)).toEqual({
      playerId: P1,
      role: 'attacker',
      unitsBefore: units({ cavalry: 6 }),
      unitsLost: units({ cavalry: 3 }),
      unitsRemaining: units({ cavalry: 3 }),
      strength: {
        contributions: [{ unitType: 'cavalry', targetType: 'line', value: 6 }],
        baseStrength: 6,
        bonuses: [],
        totalStrength: 6,
      },
    });
    expect(sideOf(result, P2).strength.totalStrength).toBe(5);
  });

  it.each([
    {
      name: 'fewer than two sides',
      sides: [battleSide(P1, 'attacker', { line: 1 })],
      issue: 'a battle needs at least 2 sides',
    },
    {
      name: 'a side without units',
      sides: [
        battleSide(P1, 'attacker', {}),
        battleSide(P2, 'defender', { line: 1 }),
      ],
      issue: 'side p1 has no units',
    },
    {
      name: 'a player on two sides',
      sides: [
        battleSide(P1, 'attacker', { line: 1 }),
        battleSide(P1, 'defender', { line: 1 }),
      ],
      issue: 'player p1 appears on more than one side',
    },
    {
      name: 'two defenders',
      sides: [
        battleSide(P1, 'defender', { line: 1 }),
        battleSide(P2, 'defender', { line: 1 }),
      ],
      issue: 'a battle has at most one defender',
    },
  ])('rejects $name', ({ sides, issue }) => {
    expect(() => resolveBattle(sides, TEST_COMBAT_RULES)).toThrow(
      new EngineContractError(`Invalid battle: ${issue}`),
    );
  });
});

function zeroOffense(): BattleSide['profile']['offense'] {
  const zeroRow = { line: 0, cavalry: 0, skirmishers: 0, artillery: 0 };
  return {
    line: zeroRow,
    cavalry: zeroRow,
    skirmishers: zeroRow,
    artillery: zeroRow,
  };
}
