import type {
  MatchConfig,
  MatchState,
  PlayerId,
  StrengthBreakdown,
  UnitCounts,
  UnitType,
  ZoneId,
  ZoneState,
} from '@lunch-campaign/engine';
import {
  computeStrength,
  createZoneBattleSides,
  effectiveParameters,
  findZone,
  requirePresent,
  totalUnitCount,
  UNIT_TYPES,
  unitTypesPresent,
} from '@lunch-campaign/engine';
import type { MatchLogs } from './player-view';
import type { SpyReport } from './spy-report';

/** A move the viewer is planning: these units into that zone. */
export interface MatchupPlan {
  readonly toZoneId: ZoneId;
  readonly units: UnitCounts;
}

/** Which enemy types one of your types beats, and which beat it. */
export interface CounterHint {
  readonly unitType: UnitType;
  readonly beats: readonly UnitType[];
  readonly beatenBy: readonly UnitType[];
}

export interface StrengthEstimate {
  readonly attacker: StrengthBreakdown;
  readonly defender: StrengthBreakdown;
  /** The defender wins ties. */
  readonly likelyWinner: 'you' | 'defender';
}

/**
 * What the viewer can know about a planned attack before the night. Built only from what the viewer may
 * see: the zone's public count, today's spy report on it, and modifiers that are public (commanders,
 * upgrades, the day's event, abilities already revealed). Tonight's abilities, bombardment and other
 * players' moves can change the outcome, so an estimate is never a promise.
 */
export type MatchupPreview =
  | { readonly kind: 'reinforcement' }
  | { readonly kind: 'unopposed' }
  | { readonly kind: 'countHidden'; readonly hints: readonly CounterHint[] }
  | {
      readonly kind: 'countOnly';
      readonly defenderCount: number;
      readonly hints: readonly CounterHint[];
    }
  | {
      readonly kind: 'estimate';
      readonly estimate: StrengthEstimate;
      /** Units the spy could not identify, left out of the estimate. */
      readonly unidentified: number;
      readonly hints: readonly CounterHint[];
    };

interface PreviewContext {
  readonly state: MatchState;
  readonly config: MatchConfig;
  readonly viewerId: PlayerId;
  readonly plan: MatchupPlan;
  readonly zone: ZoneState;
  readonly report: SpyReport | undefined;
}

interface PreviewRule {
  readonly applies: (context: PreviewContext) => boolean;
  readonly preview: (context: PreviewContext) => MatchupPreview;
}

const PREVIEW_RULES: readonly PreviewRule[] = [
  {
    applies: ({ zone, viewerId }): boolean => zone.ownerId === viewerId,
    preview: (): MatchupPreview => ({ kind: 'reinforcement' }),
  },
  {
    applies: ({ report }): boolean => report !== undefined,
    preview: (context): MatchupPreview =>
      previewFromReport(context, requirePresent(context.report, 'spy report')),
  },
  {
    applies: (context): boolean =>
      !effectiveParameters(
        context.state,
        context.config,
        context.viewerId,
        null,
      ).unitCountsVisible,
    preview: (context): MatchupPreview => ({
      kind: 'countHidden',
      hints: counterHints(context),
    }),
  },
  {
    applies: ({ zone }): boolean => defendingCount(zone) === 0,
    preview: (): MatchupPreview => ({ kind: 'unopposed' }),
  },
];

/** The preview of a planned attack, as the viewer may see it. */
export function previewMatchup(
  state: MatchState,
  logs: MatchLogs,
  viewerId: PlayerId,
  plan: MatchupPlan,
  config: MatchConfig,
): MatchupPreview {
  const context: PreviewContext = {
    state,
    config,
    viewerId,
    plan,
    zone: findZone(state, plan.toZoneId),
    report: todaysReport(state, logs, viewerId, plan.toZoneId),
  };
  const rule = PREVIEW_RULES.find((candidate): boolean =>
    candidate.applies(context),
  );
  return rule === undefined ? countOnly(context) : rule.preview(context);
}

function todaysReport(
  state: MatchState,
  logs: MatchLogs,
  viewerId: PlayerId,
  zoneId: ZoneId,
): SpyReport | undefined {
  return logs.spyLog
    .filter((report): boolean =>
      isTodaysReportBy(report, viewerId, state.turnNumber),
    )
    .findLast((report): boolean => report.zoneId === zoneId);
}

function isTodaysReportBy(
  report: SpyReport,
  viewerId: PlayerId,
  turnNumber: number,
): boolean {
  return report.playerId === viewerId && report.turnNumber === turnNumber;
}

function previewFromReport(
  context: PreviewContext,
  report: SpyReport,
): MatchupPreview {
  const defenderId = identifiedDefender(report);
  return defenderId === null
    ? countFromReport(context, report)
    : estimateFromReport(context, report, defenderId);
}

/** The zone's owner, when the spy identified at least one of their units. */
function identifiedDefender(report: SpyReport): PlayerId | null {
  return totalUnitCount(report.units) > 0 ? report.ownerId : null;
}

/** A report with nothing identified: as good as a count. */
function countFromReport(
  context: PreviewContext,
  report: SpyReport,
): MatchupPreview {
  return report.unidentified === 0
    ? { kind: 'unopposed' }
    : {
        kind: 'countOnly',
        defenderCount: report.unidentified,
        hints: counterHints(context),
      };
}

function estimateFromReport(
  context: PreviewContext,
  report: SpyReport,
  defenderId: PlayerId,
): MatchupPreview {
  const battle: ZoneState = {
    zoneId: context.zone.zoneId,
    ownerId: defenderId,
    armies: [
      { playerId: defenderId, units: report.units },
      { playerId: context.viewerId, units: context.plan.units },
    ],
  };
  const [defender, attacker] = createZoneBattleSides(
    context.state,
    context.config,
    battle,
  );
  const defenderSide = requirePresent(defender, 'the defending side');
  const attackerSide = requirePresent(attacker, 'the attacking side');
  const estimate = {
    attacker: computeStrength(attackerSide, [defenderSide]),
    defender: computeStrength(defenderSide, [attackerSide]),
  };
  return {
    kind: 'estimate',
    estimate: { ...estimate, likelyWinner: winnerOf(estimate) },
    unidentified: report.unidentified,
    hints: counterHints(context),
  };
}

function winnerOf(
  estimate: Omit<StrengthEstimate, 'likelyWinner'>,
): StrengthEstimate['likelyWinner'] {
  return estimate.attacker.totalStrength > estimate.defender.totalStrength
    ? 'you'
    : 'defender';
}

function countOnly(context: PreviewContext): MatchupPreview {
  return {
    kind: 'countOnly',
    defenderCount: defendingCount(context.zone),
    hints: counterHints(context),
  };
}

function defendingCount(zone: ZoneState): number {
  return zone.armies.reduce(
    (total, army): number => total + totalUnitCount(army.units),
    0,
  );
}

/** For each type you send: what it beats with your offense, and what beats it with the defender's. */
function counterHints(context: PreviewContext): readonly CounterHint[] {
  const yours = effectiveParameters(
    context.state,
    context.config,
    context.viewerId,
    context.zone.zoneId,
  );
  const theirs =
    context.zone.ownerId === null
      ? yours
      : effectiveParameters(
          context.state,
          context.config,
          context.zone.ownerId,
          context.zone.zoneId,
        );
  return unitTypesPresent(context.plan.units).map(
    (unitType): CounterHint => ({
      unitType,
      beats: UNIT_TYPES.filter(
        (target): boolean => yours.offense[unitType][target] > 1,
      ),
      beatenBy: UNIT_TYPES.filter(
        (enemy): boolean => theirs.offense[enemy][unitType] > 1,
      ),
    }),
  );
}
