import { TestBed } from '@angular/core/testing';
import type { VisibleEvent } from '@lunch-campaign/contracts';
import type {
  BattleResult,
  PlayerId,
  ReplayEvent,
} from '@lunch-campaign/engine';
import { createUnitCounts, NO_UNITS, toZoneId } from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import {
  KUTUZOV_PLAYER,
  NAPOLEON_PLAYER,
  WELLINGTON_PLAYER,
  weekMatch,
} from '../../../testing/match-fixtures';
import type { NarrationContext } from './narrate-event';
import { narrateNight } from './narrate-event';

const NIGHTS = [1, 2, 3, 4, 5];
const A1 = toZoneId('A1');
const A2 = toZoneId('A2');

function contextFor(
  dayIndex: number,
  viewerId: PlayerId = NAPOLEON_PLAYER,
): NarrationContext {
  const translator = TestBed.inject(Translator);
  return {
    translator,
    roster: rosterOf(weekMatch(dayIndex, viewerId), translator),
    formatStrength: (strength): string => strength.toFixed(1),
  };
}

/** The night as text, one step a line, details indented, zones in brackets: easy to read in a snapshot. */
function story(
  events: readonly VisibleEvent[],
  context: NarrationContext,
): string {
  return narrateNight(events, context)
    .map((narration) =>
      [
        `${narration.text} [${narration.zoneIds.join(' ')}]`,
        ...narration.details.map((detail) => `    ${detail}`),
      ].join('\n'),
    )
    .join('\n');
}

function full(event: ReplayEvent): VisibleEvent {
  return { visibility: 'full', event };
}

const ONE_SIDED_WIN: BattleResult = {
  outcome: { kind: 'mutualDestruction' },
  sides: [
    {
      playerId: NAPOLEON_PLAYER,
      role: 'attacker',
      unitsBefore: createUnitCounts({ line: 2 }),
      unitsLost: createUnitCounts({ line: 2 }),
      unitsRemaining: NO_UNITS,
      strength: {
        contributions: [],
        baseStrength: 2,
        bonuses: [],
        totalStrength: 2,
      },
    },
  ],
};

describe('narrateNight', () => {
  describe.each([
    { who: 'Napoleon', viewerId: NAPOLEON_PLAYER },
    { who: 'Kutuzov', viewerId: KUTUZOV_PLAYER },
  ])('the scripted week as $who saw it', ({ viewerId }) => {
    it.each(NIGHTS)('night %i', (night) => {
      const context = contextFor(night, viewerId);
      expect(
        story(weekMatch(night, viewerId).view.lastNight, context),
      ).toMatchSnapshot();
    });
  });

  it.each([
    {
      what: 'a refused order',
      event: full({
        type: 'OrderRejected',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        orderIndex: 0,
        order: { kind: 'recruit', unitType: 'line', count: 1 },
        reason: 'insufficientSupply',
      }),
      text: 'Your order 1 was not carried out: Not enough supply. []',
    },
    {
      what: 'an upgrade',
      event: full({
        type: 'UpgradeBought',
        turnNumber: 1,
        playerId: WELLINGTON_PLAYER,
        upgradeId: 'lancers',
        cost: 6,
      }),
      text: 'Bo bought Lancers []',
    },
    {
      what: 'your own ability on a zone',
      event: full({
        type: 'AbilityUsed',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        commanderId: 'napoleon',
        abilityId: 'grand-battery',
        target: { kind: 'ownedZone', zoneId: A1 },
      }),
      text: 'Ana (you) used Grand Battery on A1 [A1]',
    },
    {
      what: 'your own reinforcement',
      event: full({
        type: 'AbilityUsed',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        commanderId: 'blucher',
        abilityId: 'marschall-vorwarts',
        target: {
          kind: 'reinforcement',
          fromZoneId: A1,
          toZoneId: A2,
          units: createUnitCounts({ line: 2 }),
        },
      }),
      text: 'Ana (you) used Marschall Vorwärts, sending 2 line: A1 → A2 [A1 A2]',
    },
    {
      what: 'someone else’s ability',
      event: {
        visibility: 'abilityRevealed',
        event: {
          type: 'AbilityUsed',
          turnNumber: 1,
          playerId: WELLINGTON_PLAYER,
          commanderId: 'wellington',
          abilityId: 'reverse-slope',
          target: { kind: 'none' },
        },
      },
      text: 'Bo used Reverse Slope []',
    },
    {
      what: 'someone else’s reinforcement',
      event: {
        visibility: 'abilityRevealed',
        event: {
          type: 'AbilityUsed',
          turnNumber: 1,
          playerId: WELLINGTON_PLAYER,
          commanderId: 'blucher',
          abilityId: 'marschall-vorwarts',
          target: {
            kind: 'reinforcement',
            fromZoneId: A1,
            toZoneId: A2,
            count: 3,
          },
        },
      },
      text: 'Bo used Marschall Vorwärts, sending 3 units: A1 → A2 [A1 A2]',
    },
    {
      what: 'an ability without effect',
      event: full({
        type: 'AbilityHadNoEffect',
        turnNumber: 1,
        playerId: WELLINGTON_PLAYER,
        modifierId: 'x',
      }),
      text: "Bo's ability had no effect []",
    },
    {
      what: 'free units',
      event: full({
        type: 'UnitsGranted',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        zoneId: A1,
        units: createUnitCounts({ line: 2 }),
        modifierId: 'event:levee-en-masse:3',
      }),
      text: 'Ana (you) received 2 line at A1 [A1]',
    },
    {
      what: 'a bounced move',
      event: full({
        type: 'MoveBounced',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        fromZoneId: A1,
        toZoneId: A2,
        units: createUnitCounts({ cavalry: 1 }),
      }),
      text: "Ana (you)'s move A1 → A2 bounced back (1 cavalry) [A1 A2]",
    },
    {
      what: 'reinforcements joining',
      event: full({
        type: 'ReinforcementsJoined',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        fromZoneId: A1,
        toZoneId: A2,
        units: createUnitCounts({ line: 1 }),
        modifierId: 'ability:blucher:p1:1',
      }),
      text: 'Ana (you) sent 1 line to join the battle: A1 → A2 [A1 A2]',
    },
    {
      what: 'a retreat with nowhere to go',
      event: full({
        type: 'RetreatBlocked',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        zoneId: A1,
        units: createUnitCounts({ line: 1 }),
      }),
      text: "Ana (you)'s 1 line at A1 had nowhere to retreat [A1]",
    },
    {
      what: 'a clash you fought, both sides destroyed',
      event: full({
        type: 'FieldBattle',
        turnNumber: 1,
        connection: [A1, A2],
        battle: ONE_SIDED_WIN,
      }),
      text: 'Clash between A1 and A2: both sides destroyed [A1 A2]\n    Ana (you) (attacking): 2 line → no units, strength 2.0',
    },
    {
      what: 'a clash seen from outside',
      event: {
        visibility: 'battleOutcome',
        event: {
          type: 'FieldBattle',
          turnNumber: 1,
          zoneIds: [A1, A2],
          sides: [
            {
              playerId: WELLINGTON_PLAYER,
              role: 'attacker',
              unitsBefore: 4,
              unitsAfter: 2,
            },
          ],
          outcome: { kind: 'victory', winnerId: WELLINGTON_PLAYER },
        },
      },
      text: 'Clash between A1 and A2: Bo wins [A1 A2]\n    Bo (attacking): 4 → 2',
    },
    {
      what: 'bombardment that hit nothing',
      event: full({
        type: 'Bombardment',
        turnNumber: 1,
        playerId: NAPOLEON_PLAYER,
        fromZoneId: A1,
        targetZoneId: A2,
        artillery: 1,
        hits: [],
        blockedHits: 1,
        wastedHits: 0,
      }),
      text: "Ana (you)'s 1 gun in A1 bombarded A2: no hits [A1 A2]",
    },
    {
      what: 'guns that left nobody standing',
      event: full({
        type: 'BattleDecidedByBombardment',
        turnNumber: 1,
        zoneId: A2,
        survivorId: null,
      }),
      text: 'The battle at A2 ended under bombardment: nobody left standing [A2]',
    },
    {
      what: 'a capture from another player',
      event: full({
        type: 'ZoneCaptured',
        turnNumber: 1,
        zoneId: A2,
        previousOwnerId: WELLINGTON_PLAYER,
        newOwnerId: NAPOLEON_PLAYER,
      }),
      text: 'Ana (you) captured A2 from Bo [A2]',
    },
    {
      what: 'an elimination',
      event: full({
        type: 'PlayerEliminated',
        turnNumber: 1,
        playerId: WELLINGTON_PLAYER,
      }),
      text: 'Bo was eliminated []',
    },
    {
      what: 'an ability wearing off',
      event: full({
        type: 'ModifierExpired',
        turnNumber: 1,
        modifierId: 'ability:napoleon:p1:1',
      }),
      text: 'Grand Battery wore off []',
    },
    {
      what: 'an upgrade’s effect wearing off',
      event: full({
        type: 'ModifierExpired',
        turnNumber: 1,
        modifierId: 'upgrade:lancers:p1',
      }),
      text: 'Lancers wore off []',
    },
    {
      what: 'an effect of an unknown kind wearing off',
      event: full({
        type: 'ModifierExpired',
        turnNumber: 1,
        modifierId: 'mystery',
      }),
      text: 'An effect wore off []',
    },
  ] satisfies readonly { what: string; event: VisibleEvent; text: string }[])(
    'tells $what',
    ({ event, text }) => {
      expect(story([event], contextFor(1))).toBe(text);
    },
  );
});
