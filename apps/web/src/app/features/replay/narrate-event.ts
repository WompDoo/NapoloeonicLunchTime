import type {
  AbilityRevealed,
  BattleFormedSummary,
  BattleOutcomeSummary,
  CountedEvent,
  VisibleAbilityTarget,
  VisibleEvent,
} from '@lunch-campaign/contracts';
import type {
  AbilityTarget,
  BattleOutcome,
  BattleResult,
  BattleRole,
  BombardmentHit,
  PlayerId,
  ReplayEvent,
  ZoneId,
} from '@lunch-campaign/engine';
import { mapUnitTypes, totalUnitCount } from '@lunch-campaign/engine';
import type { TranslationKey } from '../../core/i18n/en';
import type { Translator } from '../../core/i18n/translator';
import { unitsText } from '../../shared/army-text';
import {
  commanderAbilityName,
  eventName,
  upgradeName,
} from '../../shared/content-keys';
import type { Roster } from '../../shared/roster';

/** One step of the replay: what happened, any detail lines, and the zones to show on the map. */
export interface Narration {
  readonly text: string;
  readonly details: readonly string[];
  readonly zoneIds: readonly ZoneId[];
}

export interface NarrationContext {
  readonly translator: Translator;
  readonly roster: Roster;
  /** Battle strengths, rounded for reading. */
  readonly formatStrength: (strength: number) => string;
}

type EventOfType<TType extends ReplayEvent['type']> = Extract<
  ReplayEvent,
  { readonly type: TType }
>;
type Narrator<TEvent> = (
  event: TEvent,
  context: NarrationContext,
) => readonly Narration[];

const ROUTE_ARROW = ' → ';
const LIST_SEPARATOR = '; ';
const NOTHING: readonly Narration[] = [];

function told(
  text: string,
  zoneIds: readonly ZoneId[],
  details: readonly string[] = [],
): readonly Narration[] {
  return [{ text, details, zoneIds }];
}

function routeOf(zoneIds: readonly ZoneId[]): string {
  return zoneIds.join(ROUTE_ARROW);
}

/** Events about one player's units: the key, given the units as words and the zones as a route. */
const UNIT_STORY_KEYS: Readonly<Record<CountedEvent['type'], TranslationKey>> =
  {
    UnitsRecruited: 'replay.recruited',
    UnitsGranted: 'replay.granted',
    ArmyMoved: 'replay.moved',
    MoveBounced: 'replay.bounced',
    ReinforcementsJoined: 'replay.reinforced',
    Retreated: 'replay.retreated',
    RetreatBlocked: 'replay.retreatBlocked',
    UnitsLostToModifier: 'replay.lostToEvent',
  };

function unitStory(
  story: {
    readonly type: CountedEvent['type'];
    readonly playerId: PlayerId;
    readonly zoneIds: readonly ZoneId[];
  },
  units: string,
  { translator, roster }: NarrationContext,
): readonly Narration[] {
  const route = routeOf(story.zoneIds);
  return told(
    translator.translate(UNIT_STORY_KEYS[story.type], {
      player: roster.nameOf(story.playerId),
      units,
      zone: route,
      route,
    }),
    story.zoneIds,
  );
}

const OUTCOME_TEXTS: {
  readonly [TKind in BattleOutcome['kind']]: (
    outcome: Extract<BattleOutcome, { readonly kind: TKind }>,
    context: NarrationContext,
  ) => string;
} = {
  victory: (outcome, { translator, roster }): string =>
    translator.translate('replay.wins', {
      player: roster.nameOf(outcome.winnerId),
    }),
  mutualDestruction: (_outcome, { translator }): string =>
    translator.translate('replay.bothDestroyed'),
};

function outcomeText(
  outcome: BattleOutcome,
  context: NarrationContext,
): string {
  const describe = OUTCOME_TEXTS[outcome.kind] as (
    outcome: BattleOutcome,
    context: NarrationContext,
  ) => string;
  return describe(outcome, context);
}

function roleText(role: BattleRole, translator: Translator): string {
  return translator.translate(`replay.role.${role}`);
}

/** A battle you fought in: each side's units before and after, and its strength. */
function foughtSides(
  battle: BattleResult,
  { translator, roster, formatStrength }: NarrationContext,
): readonly string[] {
  return battle.sides.map((side): string =>
    translator.translate('replay.sideStrength', {
      player: roster.nameOf(side.playerId),
      role: roleText(side.role, translator),
      before: unitsText(side.unitsBefore, translator),
      after: unitsText(side.unitsRemaining, translator),
      strength: formatStrength(side.strength.totalStrength),
    }),
  );
}

/** A battle seen from outside: counts only. */
function summarisedSides(
  summary: BattleOutcomeSummary,
  { translator, roster }: NarrationContext,
): readonly string[] {
  return summary.sides.map((side): string =>
    translator.translate('replay.side', {
      player: roster.nameOf(side.playerId),
      role: roleText(side.role, translator),
      before: side.unitsBefore,
      after: side.unitsAfter,
    }),
  );
}

function battleHeadline(
  zoneIds: readonly ZoneId[],
  outcome: BattleOutcome,
  context: NarrationContext,
): string {
  const [from, to] = zoneIds;
  return zoneIds.length === 1
    ? context.translator.translate('replay.battleAt', {
        zone: String(from),
        outcome: outcomeText(outcome, context),
      })
    : context.translator.translate('replay.fieldBattle', {
        from: String(from),
        to: String(to),
        outcome: outcomeText(outcome, context),
      });
}

/** Bombardment hits, grouped per player in the order they were hit: "Ana lost 2 line; Bo lost 1 gun". */
function hitsText(
  hits: readonly BombardmentHit[],
  { translator, roster }: NarrationContext,
): string {
  const groups = [...new Set(hits.map((hit): PlayerId => hit.playerId))].map(
    (playerId): string =>
      translator.translate('replay.hit', {
        player: roster.nameOf(playerId),
        units: unitsText(
          mapUnitTypes(
            (unitType): number =>
              hits.filter(
                (hit): boolean =>
                  hit.playerId === playerId && hit.unitType === unitType,
              ).length,
          ),
          translator,
        ),
      }),
  );
  return groups.length === 0
    ? translator.translate('replay.noHits')
    : groups.join(LIST_SEPARATOR);
}

type TargetOfKind<TKind extends VisibleAbilityTarget['kind']> = Extract<
  VisibleAbilityTarget,
  { readonly kind: TKind }
>;

type AbilityTexts = {
  readonly [TKind in VisibleAbilityTarget['kind']]: (
    target: TargetOfKind<TKind>,
    words: AbilityWords,
    translator: Translator,
  ) => Narration;
};

/** An ability and its target; reinforcement units come as words (your own) or a count (someone else's). */
const ABILITY_TEXTS: AbilityTexts = {
  none: (_target, words, translator): Narration => ({
    text: translator.translate('replay.ability', { ...words }),
    details: [],
    zoneIds: [],
  }),
  ownedZone: (target, words, translator): Narration => ({
    text: translator.translate('replay.abilityZone', {
      ...words,
      zone: target.zoneId,
    }),
    details: [],
    zoneIds: [target.zoneId],
  }),
  reinforcement: (target, words, translator): Narration => ({
    text: translator.translate('replay.abilityReinforce', {
      ...words,
      route: routeOf([target.fromZoneId, target.toZoneId]),
    }),
    details: [],
    zoneIds: [target.fromZoneId, target.toZoneId],
  }),
};

interface AbilityWords {
  readonly player: string;
  readonly ability: string;
  readonly units: string;
}

function abilityNarration(
  event: {
    readonly playerId: PlayerId;
    readonly commanderId: string;
    readonly target: VisibleAbilityTarget;
  },
  units: string,
  { translator, roster }: NarrationContext,
): readonly Narration[] {
  const words: AbilityWords = {
    player: roster.nameOf(event.playerId),
    ability: translator.translate(commanderAbilityName(event.commanderId)),
    units,
  };
  const describe = ABILITY_TEXTS[event.target.kind] as (
    target: VisibleAbilityTarget,
    words: AbilityWords,
    translator: Translator,
  ) => Narration;
  return [describe(event.target, words, translator)];
}

/** The units of your own ability's target, as words. */
function ownTargetUnits(target: AbilityTarget, translator: Translator): string {
  return target.kind === 'reinforcement'
    ? unitsText(target.units, translator)
    : '';
}

/** Names for what a modifier id refers to, by the id's prefix ("event:mud:3", "ability:napoleon:p1:2"). */
const MODIFIER_NAMES: Readonly<
  Record<string, (contentId: string) => TranslationKey>
> = {
  event: eventName,
  ability: commanderAbilityName,
  upgrade: upgradeName,
};

const MODIFIER_ID_SEPARATOR = ':';

function modifierName(modifierId: string, translator: Translator): string {
  const [prefix, contentId] = modifierId.split(MODIFIER_ID_SEPARATOR);
  const nameKey = MODIFIER_NAMES[String(prefix)];
  return nameKey === undefined
    ? translator.translate('replay.someEffect')
    : translator.translate(nameKey(String(contentId)));
}

type FullNarrators = {
  readonly [TType in ReplayEvent['type']]: Narrator<EventOfType<TType>>;
};

const OWN_UNIT_STORY = (
  event: Extract<ReplayEvent, { readonly type: CountedEvent['type'] }> & {
    readonly playerId: PlayerId;
  },
  zoneIds: readonly ZoneId[],
  units: string,
  context: NarrationContext,
): readonly Narration[] =>
  unitStory(
    { type: event.type, playerId: event.playerId, zoneIds },
    units,
    context,
  );

const FULL_NARRATORS: FullNarrators = {
  OrderRejected: (event, { translator }): readonly Narration[] =>
    told(
      translator.translate('replay.rejected', {
        number: event.orderIndex + 1,
        reason: translator.translate(`orders.problem.${event.reason}`),
      }),
      [],
    ),
  UnitsRecruited: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.zoneId],
      context.translator.translate(`units.${event.unitType}`, {
        count: event.count,
      }),
      context,
    ),
  UpgradeBought: (event, { translator, roster }): readonly Narration[] =>
    told(
      translator.translate('replay.upgrade', {
        player: roster.nameOf(event.playerId),
        upgrade: translator.translate(upgradeName(event.upgradeId)),
      }),
      [],
    ),
  AbilityUsed: (event, context): readonly Narration[] =>
    abilityNarration(
      { ...event, target: visibleTargetOf(event.target) },
      ownTargetUnits(event.target, context.translator),
      context,
    ),
  AbilityHadNoEffect: (event, { translator, roster }): readonly Narration[] =>
    told(
      translator.translate('replay.abilityNoEffect', {
        player: roster.nameOf(event.playerId),
      }),
      [],
    ),
  UnitsGranted: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.zoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  ArmyMoved: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.fromZoneId, ...event.viaZoneIds, event.toZoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  MoveBounced: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.fromZoneId, event.toZoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  FieldBattle: (event, context): readonly Narration[] =>
    told(
      battleHeadline([...event.connection], event.battle.outcome, context),
      [...event.connection],
      foughtSides(event.battle, context),
    ),
  ReinforcementsJoined: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.fromZoneId, event.toZoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  BattleFormed: (event, context): readonly Narration[] =>
    formation(
      event.zoneId,
      event.sides.map(
        (side): FormationSide => ({
          playerId: side.playerId,
          role: side.role,
          units: unitsText(side.units, context.translator),
        }),
      ),
      context,
    ),
  Bombardment: (event, context): readonly Narration[] =>
    told(
      context.translator.translate('replay.bombardment', {
        player: context.roster.nameOf(event.playerId),
        guns: context.translator.translate('units.artillery', {
          count: event.artillery,
        }),
        from: event.fromZoneId,
        target: event.targetZoneId,
        hits: hitsText(event.hits, context),
      }),
      [event.fromZoneId, event.targetZoneId],
    ),
  BattleDecidedByBombardment: (
    event,
    { translator, roster },
  ): readonly Narration[] =>
    told(
      translator.translate('replay.decidedByGuns', {
        zone: event.zoneId,
        survivor:
          event.survivorId === null
            ? translator.translate('replay.nobody')
            : roster.nameOf(event.survivorId),
      }),
      [event.zoneId],
    ),
  BattleResolved: (event, context): readonly Narration[] =>
    told(
      battleHeadline([event.zoneId], event.battle.outcome, context),
      [event.zoneId],
      foughtSides(event.battle, context),
    ),
  Retreated: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.fromZoneId, event.toZoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  RetreatBlocked: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.zoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  ZoneCaptured: (event, { translator, roster }): readonly Narration[] =>
    told(
      event.previousOwnerId === null
        ? translator.translate('replay.captured', {
            player: roster.nameOf(event.newOwnerId),
            zone: event.zoneId,
          })
        : translator.translate('replay.capturedFrom', {
            player: roster.nameOf(event.newOwnerId),
            zone: event.zoneId,
            previous: roster.nameOf(event.previousOwnerId),
          }),
      [event.zoneId],
    ),
  UnitsLostToModifier: (event, context): readonly Narration[] =>
    OWN_UNIT_STORY(
      event,
      [event.zoneId],
      unitsText(event.units, context.translator),
      context,
    ),
  SupplyProduced: (event, { translator, roster }): readonly Narration[] =>
    told(
      translator.translate('replay.produced', {
        player: roster.nameOf(event.playerId),
        supply: translator.translate('common.supply', { count: event.amount }),
      }),
      [],
    ),
  PointsAwarded: (event, { translator, roster }): readonly Narration[] =>
    told(
      translator.translate('replay.scored', {
        player: roster.nameOf(event.playerId),
        points: translator.translate('common.points', { count: event.points }),
        cities: translator.translate('replay.cities', {
          count: event.citiesHeld,
        }),
      }),
      [],
    ),
  PlayerEliminated: (event, { translator, roster }): readonly Narration[] =>
    told(
      translator.translate('replay.eliminated', {
        player: roster.nameOf(event.playerId),
      }),
      [],
    ),
  ModifierExpired: (event, { translator }): readonly Narration[] =>
    told(
      translator.translate('replay.expired', {
        name: modifierName(event.modifierId, translator),
      }),
      [],
    ),
  EventAnnounced: (event, { translator }): readonly Narration[] =>
    told(
      translator.translate('replay.announced', {
        event: translator.translate(eventName(event.eventId)),
        day: event.activeTurnNumber,
      }),
      [],
    ),
  /** The standings feed the honours board; they are not a step of the story. */
  StandingsRecorded: (): readonly Narration[] => NOTHING,
};

/** Your own ability's target as the replay shows it: units become a count, like everyone else sees. */
function visibleTargetOf(target: AbilityTarget): VisibleAbilityTarget {
  return target.kind === 'reinforcement'
    ? { ...target, count: totalUnitCount(target.units) }
    : target;
}

interface FormationSide {
  readonly playerId: PlayerId;
  readonly role: BattleRole;
  readonly units: string;
}

function formation(
  zoneId: ZoneId,
  sides: readonly FormationSide[],
  { translator, roster }: NarrationContext,
): readonly Narration[] {
  return told(
    translator.translate('replay.formed', {
      zone: zoneId,
      sides: sides
        .map((side): string =>
          translator.translate('replay.formedSide', {
            player: roster.nameOf(side.playerId),
            role: roleText(side.role, translator),
            units: side.units,
          }),
        )
        .join(LIST_SEPARATOR),
    }),
    [zoneId],
  );
}

type VisibleNarrators = {
  readonly [TVisibility in VisibleEvent['visibility']]: Narrator<
    Extract<VisibleEvent, { readonly visibility: TVisibility }>['event']
  >;
};

const VISIBLE_NARRATORS: VisibleNarrators = {
  full: (event, context): readonly Narration[] => {
    const narrate = FULL_NARRATORS[event.type] as Narrator<ReplayEvent>;
    return narrate(event, context);
  },
  counted: (event, context): readonly Narration[] =>
    unitStory(
      event,
      context.translator.translate('common.units', { count: event.count }),
      context,
    ),
  battleFormed: (event: BattleFormedSummary, context): readonly Narration[] =>
    formation(
      event.zoneId,
      event.sides.map(
        (side): FormationSide => ({
          playerId: side.playerId,
          role: side.role,
          units: context.translator.translate('common.units', {
            count: side.count,
          }),
        }),
      ),
      context,
    ),
  battleOutcome: (event, context): readonly Narration[] =>
    told(
      battleHeadline(event.zoneIds, event.outcome, context),
      event.zoneIds,
      summarisedSides(event, context),
    ),
  abilityRevealed: (event: AbilityRevealed, context): readonly Narration[] =>
    abilityNarration(
      event,
      event.target.kind === 'reinforcement'
        ? context.translator.translate('common.units', {
            count: event.target.count,
          })
        : '',
      context,
    ),
};

/** The night as a story, one step per thing that happened, in the viewer's language. */
export function narrateNight(
  events: readonly VisibleEvent[],
  context: NarrationContext,
): readonly Narration[] {
  return events.flatMap((visible): readonly Narration[] => {
    const narrate = VISIBLE_NARRATORS[visible.visibility] as Narrator<
      VisibleEvent['event']
    >;
    return narrate(visible.event, context);
  });
}
