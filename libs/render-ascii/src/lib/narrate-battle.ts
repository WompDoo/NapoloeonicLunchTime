import type {
  BattleFormedSummary,
  BattleOutcome,
  BattleOutcomeSummary,
  BattleResult,
  BattleRole,
  BattleSideResult,
  FoughtSideSummary,
  ReplayEvent,
  StrengthBonus,
  StrengthBreakdown,
  StrengthContribution,
  ZoneId,
} from '@lunch-campaign/player-view';
import {
  describeCount,
  describeUnits,
  formatNumber,
  formatPercent,
} from './text';

type BattleFormedEvent = Extract<
  ReplayEvent,
  { readonly type: 'BattleFormed' }
>;

const SIDE_INDENT = '  ';
const DETAIL_INDENT = '    ';

const ROLE_VERBS: Readonly<Record<BattleRole, string>> = {
  attacker: 'attacks with',
  defender: 'defends with',
};

type OutcomeTexts = {
  readonly [TKind in BattleOutcome['kind']]: (
    outcome: Extract<BattleOutcome, { readonly kind: TKind }>,
  ) => string;
};

const OUTCOME_TEXTS: OutcomeTexts = {
  victory: (outcome): string => `${outcome.winnerId} wins`,
  mutualDestruction: (): string => 'both sides destroyed',
};

const HEADINGS: Readonly<
  Record<BattleOutcomeSummary['type'], (zoneIds: readonly ZoneId[]) => string>
> = {
  BattleResolved: (zoneIds): string => `Battle at ${zoneIds.join(', ')}`,
  FieldBattle: (zoneIds): string =>
    `Field battle between ${zoneIds.join(' and ')}`,
};

/** A battle the viewer fought in: compositions, losses and why each side was as strong as it was. */
export function narrateBattle(
  type: BattleOutcomeSummary['type'],
  zoneIds: readonly ZoneId[],
  battle: BattleResult,
): readonly string[] {
  return [
    `${HEADINGS[type](zoneIds)}: ${outcomeText(battle.outcome)}`,
    ...battle.sides.flatMap(narrateSide),
  ];
}

/** A battle seen from outside: each side's count before and after, and the outcome. */
export function narrateBattleSummary(
  summary: BattleOutcomeSummary,
): readonly string[] {
  return [
    `${HEADINGS[summary.type](summary.zoneIds)}: ${outcomeText(summary.outcome)}`,
    ...summary.sides.map(
      (side: FoughtSideSummary): string =>
        `${SIDE_INDENT}${side.playerId} (${side.role}): ${describeCount(side.unitsBefore)} -> ${describeCount(side.unitsAfter)}`,
    ),
  ];
}

export function narrateFormation(event: BattleFormedEvent): string {
  return formationText(
    event.zoneId,
    event.sides.map(
      (side): string =>
        `${side.playerId} ${ROLE_VERBS[side.role]} ${describeUnits(side.units)}`,
    ),
  );
}

export function narrateFormationSummary(summary: BattleFormedSummary): string {
  return formationText(
    summary.zoneId,
    summary.sides.map(
      (side): string =>
        `${side.playerId} ${ROLE_VERBS[side.role]} ${describeCount(side.count)}`,
    ),
  );
}

function formationText(zoneId: ZoneId, sides: readonly string[]): string {
  return `Battle forms at ${zoneId}: ${sides.join('; ')}`;
}

function narrateSide(side: BattleSideResult): readonly string[] {
  return [
    `${SIDE_INDENT}${side.playerId} (${side.role}): ${describeUnits(side.unitsBefore)} -> ${describeUnits(side.unitsRemaining)}, strength ${strengthText(side.strength)}`,
    `${DETAIL_INDENT}${contributionsText(side.strength.contributions)}`,
  ];
}

function outcomeText(outcome: BattleOutcome): string {
  const describe = OUTCOME_TEXTS[outcome.kind] as (
    outcome: BattleOutcome,
  ) => string;
  return describe(outcome);
}

/** "6.25 (5 base, +25% defender)", or just "4" without bonuses. */
function strengthText(strength: StrengthBreakdown): string {
  return strength.bonuses.length === 0
    ? formatNumber(strength.totalStrength)
    : `${formatNumber(strength.totalStrength)} (${formatNumber(strength.baseStrength)} base, ${strength.bonuses.map(bonusText).join(', ')})`;
}

function bonusText(bonus: StrengthBonus): string {
  return `+${formatPercent(bonus.value)} ${bonus.source}`;
}

function contributionsText(
  contributions: readonly StrengthContribution[],
): string {
  return contributions.length === 0
    ? 'no units left to fight'
    : contributions
        .map(
          (contribution): string =>
            `${contribution.unitType} vs ${contribution.targetType} ${formatNumber(contribution.value)}`,
        )
        .join(', ');
}
