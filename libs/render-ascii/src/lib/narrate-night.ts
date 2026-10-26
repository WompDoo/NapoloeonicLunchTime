import type {
  AbilityTarget,
  BombardmentHit,
  CountedEvent,
  CountedSource,
  PlayerId,
  PlayerStanding,
  ReplayEvent,
  VisibleAbilityTarget,
  VisibleEvent,
  ZoneId,
} from '@lunch-campaign/player-view';
import { countedEventDetails } from '@lunch-campaign/player-view';
import {
  narrateBattle,
  narrateBattleSummary,
  narrateFormation,
  narrateFormationSummary,
} from './narrate-battle';
import { describeCount, describeUnits, humanise, plural } from './text';

type EventOfType<TType extends ReplayEvent['type']> = Extract<
  ReplayEvent,
  { readonly type: TType }
>;

/** A player's units doing something, with the units as the viewer may see them ("3L 2C" or "5 units"). */
interface UnitStory {
  readonly type: CountedEvent['type'];
  readonly playerId: PlayerId;
  readonly zoneIds: readonly ZoneId[];
  readonly units: string;
}

const UNIT_STORIES: Readonly<
  Record<CountedEvent['type'], (story: UnitStory, route: string) => string>
> = {
  UnitsRecruited: (story, route): string =>
    `${story.playerId} recruited ${story.units} at ${route}`,
  UnitsGranted: (story, route): string =>
    `${story.playerId} received ${story.units} at ${route}`,
  ArmyMoved: (story, route): string =>
    `${story.playerId} moved ${story.units}: ${route}`,
  MoveBounced: (story, route): string =>
    `${story.playerId}'s move ${route} bounced back (${story.units})`,
  ReinforcementsJoined: (story, route): string =>
    `${story.playerId} sent ${story.units} to join the battle: ${route}`,
  Retreated: (story, route): string =>
    `${story.playerId} retreated ${story.units}: ${route}`,
  RetreatBlocked: (story, route): string =>
    `${story.playerId}'s ${story.units} at ${route} had nowhere to retreat`,
  UnitsLostToModifier: (story, route): string =>
    `${story.playerId} lost ${story.units} at ${route}`,
};

type FullNarrators = {
  readonly [TType in ReplayEvent['type']]: (
    event: EventOfType<TType>,
  ) => readonly string[];
};

const FULL_NARRATORS: FullNarrators = {
  OrderRejected: (event): readonly string[] => [
    `${event.playerId}'s order ${event.orderIndex + 1} (${event.order.kind}) was rejected: ${humanise(event.reason)}`,
  ],
  UnitsRecruited: narrateOwnUnits,
  UpgradeBought: (event): readonly string[] => [
    `${event.playerId} bought ${event.upgradeId} for ${event.cost} supply`,
  ],
  AbilityUsed: (event): readonly string[] => [
    `${event.playerId} used ${event.abilityId}${abilityTargetText(event.target)}`,
  ],
  AbilityHadNoEffect: (event): readonly string[] => [
    `${event.playerId}'s ability had no effect`,
  ],
  UnitsGranted: narrateOwnUnits,
  ArmyMoved: narrateOwnUnits,
  MoveBounced: narrateOwnUnits,
  FieldBattle: (event): readonly string[] =>
    narrateBattle(event.type, event.connection, event.battle),
  ReinforcementsJoined: narrateOwnUnits,
  BattleFormed: (event): readonly string[] => [narrateFormation(event)],
  Bombardment: (event): readonly string[] => [
    `${event.playerId}'s ${event.artillery} artillery in ${event.fromZoneId} bombarded ${event.targetZoneId}: ${hitsText(event.hits)}${missedText(event.blockedHits, event.wastedHits)}`,
  ],
  BattleDecidedByBombardment: (event): readonly string[] => [
    `The battle at ${event.zoneId} ended under bombardment: ${event.survivorId ?? 'nobody'} left standing`,
  ],
  BattleResolved: (event): readonly string[] =>
    narrateBattle(event.type, [event.zoneId], event.battle),
  Retreated: narrateOwnUnits,
  RetreatBlocked: narrateOwnUnits,
  ZoneCaptured: (event): readonly string[] => [
    `${event.newOwnerId} captured ${event.zoneId}${capturedFromText(event.previousOwnerId)}`,
  ],
  UnitsLostToModifier: narrateOwnUnits,
  SupplyProduced: (event): readonly string[] => [
    `${event.playerId} produced ${event.amount} supply`,
  ],
  PointsAwarded: (event): readonly string[] => [
    `${event.playerId} scored ${plural(event.points, 'point', 'points')} for ${plural(event.citiesHeld, 'city', 'cities')}`,
  ],
  PlayerEliminated: (event): readonly string[] => [
    `${event.playerId} was eliminated`,
  ],
  ModifierExpired: (event): readonly string[] => [
    `${event.modifierId} wore off`,
  ],
  EventAnnounced: (event): readonly string[] => [
    `Event announced: ${event.eventId}, in play on turn ${event.activeTurnNumber}`,
  ],
  StandingsRecorded: (event): readonly string[] => [
    `Standings: ${event.standings.map(standingText).join('; ')}`,
  ],
};

type VisibleNarrators = {
  readonly [TVisibility in VisibleEvent['visibility']]: (
    event: Extract<VisibleEvent, { readonly visibility: TVisibility }>['event'],
  ) => readonly string[];
};

const VISIBLE_NARRATORS: VisibleNarrators = {
  full: (event): readonly string[] => {
    const narrate = FULL_NARRATORS[event.type] as (
      event: ReplayEvent,
    ) => readonly string[];
    return narrate(event);
  },
  counted: (event): readonly string[] => [
    unitStory({ ...event, units: describeCount(event.count) }),
  ],
  battleFormed: (event): readonly string[] => [narrateFormationSummary(event)],
  battleOutcome: narrateBattleSummary,
  abilityRevealed: (event): readonly string[] => [
    `${event.playerId} used ${event.abilityId}${revealedTargetText(event.target)}`,
  ],
};

/** One replay event as lines of text, as the viewer may see it. */
export function narrateVisibleEvent(visible: VisibleEvent): readonly string[] {
  const narrate = VISIBLE_NARRATORS[visible.visibility] as (
    event: VisibleEvent['event'],
  ) => readonly string[];
  return narrate(visible.event);
}

function narrateOwnUnits(event: CountedSource): readonly string[] {
  const details = countedEventDetails(event);
  return [
    unitStory({
      type: event.type,
      playerId: event.playerId,
      zoneIds: details.zoneIds,
      units: describeUnits(details.units),
    }),
  ];
}

function unitStory(story: UnitStory): string {
  return UNIT_STORIES[story.type](story, story.zoneIds.join(' -> '));
}

type AbilityTargetTexts = {
  readonly [TKind in AbilityTarget['kind']]: (
    target: Extract<AbilityTarget, { readonly kind: TKind }>,
  ) => string;
};

const ABILITY_TARGET_TEXTS: AbilityTargetTexts = {
  none: (): string => '',
  ownedZone: (target): string => ` on ${target.zoneId}`,
  reinforcement: (target): string =>
    ` sending ${describeUnits(target.units)}: ${target.fromZoneId} -> ${target.toZoneId}`,
};

type RevealedTargetTexts = {
  readonly [TKind in VisibleAbilityTarget['kind']]: (
    target: Extract<VisibleAbilityTarget, { readonly kind: TKind }>,
  ) => string;
};

const REVEALED_TARGET_TEXTS: RevealedTargetTexts = {
  none: (): string => '',
  ownedZone: (target): string => ` on ${target.zoneId}`,
  reinforcement: (target): string =>
    ` sending ${describeCount(target.count)}: ${target.fromZoneId} -> ${target.toZoneId}`,
};

function abilityTargetText(target: AbilityTarget): string {
  const describe = ABILITY_TARGET_TEXTS[target.kind] as (
    target: AbilityTarget,
  ) => string;
  return describe(target);
}

function revealedTargetText(target: VisibleAbilityTarget): string {
  const describe = REVEALED_TARGET_TEXTS[target.kind] as (
    target: VisibleAbilityTarget,
  ) => string;
  return describe(target);
}

function hitsText(hits: readonly BombardmentHit[]): string {
  return hits.length === 0
    ? 'no hits'
    : hits
        .map((hit): string => `${hit.playerId} lost 1 ${hit.unitType}`)
        .join(', ');
}

function missedText(blockedHits: number, wastedHits: number): string {
  return blockedHits + wastedHits === 0
    ? ''
    : ` (${blockedHits} blocked, ${wastedHits} wasted)`;
}

function capturedFromText(previousOwnerId: PlayerId | null): string {
  return previousOwnerId === null ? '' : ` from ${previousOwnerId}`;
}

function standingText(standing: PlayerStanding): string {
  return `${standing.playerId} ${describeCount(standing.units)}, ${plural(standing.zonesOwned, 'zone', 'zones')}, ${standing.score} pts`;
}
