import { EngineContractError } from '../core/engine-error';
import { findDuplicates } from '../core/decode';
import {
  hasAnyUnits,
  NO_UNITS,
  subtractUnitCounts,
  totalUnitCount,
} from '../core/unit-counts';
import type { UnitCounts } from '../core/unit-types';
import type {
  BattleOutcome,
  BattleResult,
  BattleRules,
  BattleSide,
  BattleSideResult,
  StrengthBreakdown,
} from './battle';
import { removeCasualties } from './casualties';
import { computeStrength } from './combat-strength';

/**
 * Strengths are sums of products of fractions, so equal armies can differ in the last bits of a float.
 * Anything closer than this counts as equal: ties decide battles, so they must not depend on rounding noise.
 */
export const STRENGTH_TOLERANCE = 1e-9;
const MINIMUM_SIDES_IN_BATTLE = 2;
const MAXIMUM_DEFENDERS_IN_BATTLE = 1;
const UNITS_A_WINNER_ALWAYS_KEEPS = 1;
const NO_CASUALTIES = 0;

const MUTUAL_DESTRUCTION: BattleOutcome = { kind: 'mutualDestruction' };

interface RatedSide {
  readonly side: BattleSide;
  readonly strength: StrengthBreakdown;
}

/**
 * The highest strength wins. A tie goes to the defender if it is among the tied sides; otherwise every tied
 * side is destroyed. Every side that does not win is destroyed. The winner loses
 * `ceil(lossRatio × second-highest strength)` units, but always keeps at least one.
 */
export function resolveBattle(
  sides: readonly BattleSide[],
  rules: BattleRules,
): BattleResult {
  assertValidBattle(sides);
  const ratedSides = sides.map(
    (side): RatedSide => ({
      side,
      strength: computeStrength(
        side,
        sides.filter((other): boolean => other !== side),
      ),
    }),
  );
  const winner = selectWinner(ratedSides);
  return {
    sides: ratedSides.map(
      (ratedSide): BattleSideResult =>
        toSideResult(
          ratedSide,
          remainingUnitsAfterBattle(ratedSide, winner, ratedSides, rules),
        ),
    ),
    outcome:
      winner === undefined
        ? MUTUAL_DESTRUCTION
        : { kind: 'victory', winnerId: winner.side.playerId },
  };
}

function selectWinner(ratedSides: readonly RatedSide[]): RatedSide | undefined {
  const highestStrength = Math.max(
    ...ratedSides.map((rated): number => rated.strength.totalStrength),
  );
  const leaders = ratedSides.filter((rated): boolean =>
    areStrengthsEqual(rated.strength.totalStrength, highestStrength),
  );
  const candidates =
    leaders.length > 1
      ? leaders.filter((rated): boolean => rated.side.role === 'defender')
      : leaders;
  return candidates[0];
}

function remainingUnitsAfterBattle(
  ratedSide: RatedSide,
  winner: RatedSide | undefined,
  ratedSides: readonly RatedSide[],
  rules: BattleRules,
): UnitCounts {
  return ratedSide === winner
    ? removeCasualties(
        ratedSide.side.units,
        countWinnerCasualties(ratedSide, ratedSides),
        rules.casualtyRemovalOrder,
      )
    : NO_UNITS;
}

function countWinnerCasualties(
  winner: RatedSide,
  ratedSides: readonly RatedSide[],
): number {
  const secondHighestStrength = Math.max(
    ...ratedSides
      .filter((rated): boolean => rated !== winner)
      .map((rated): number => rated.strength.totalStrength),
  );
  const casualties = ceilIgnoringRoundingNoise(
    winner.side.profile.winnerLossRatio * secondHighestStrength,
  );
  return Math.min(
    casualties,
    totalUnitCount(winner.side.units) - UNITS_A_WINNER_ALWAYS_KEEPS,
  );
}

function toSideResult(
  ratedSide: RatedSide,
  unitsRemaining: UnitCounts,
): BattleSideResult {
  return {
    playerId: ratedSide.side.playerId,
    role: ratedSide.side.role,
    unitsBefore: ratedSide.side.units,
    unitsLost: subtractUnitCounts(ratedSide.side.units, unitsRemaining),
    unitsRemaining,
    strength: ratedSide.strength,
  };
}

export function areStrengthsEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= STRENGTH_TOLERANCE;
}

function ceilIgnoringRoundingNoise(value: number): number {
  return Math.max(NO_CASUALTIES, Math.ceil(value - STRENGTH_TOLERANCE));
}

function assertValidBattle(sides: readonly BattleSide[]): void {
  const issues = [
    ...describeTooFewSides(sides),
    ...sides
      .filter((side): boolean => !hasAnyUnits(side.units))
      .map((side): string => `side ${side.playerId} has no units`),
    ...findDuplicates(sides.map((side): string => side.playerId)).map(
      (playerId): string => `player ${playerId} appears on more than one side`,
    ),
    ...describeTooManyDefenders(sides),
  ];
  if (issues.length > 0) {
    throw new EngineContractError(`Invalid battle: ${issues.join('; ')}`);
  }
}

function describeTooFewSides(sides: readonly BattleSide[]): readonly string[] {
  return sides.length < MINIMUM_SIDES_IN_BATTLE
    ? [`a battle needs at least ${MINIMUM_SIDES_IN_BATTLE} sides`]
    : [];
}

function describeTooManyDefenders(
  sides: readonly BattleSide[],
): readonly string[] {
  const defenderCount = sides.filter(
    (side): boolean => side.role === 'defender',
  ).length;
  return defenderCount > MAXIMUM_DEFENDERS_IN_BATTLE
    ? ['a battle has at most one defender']
    : [];
}
