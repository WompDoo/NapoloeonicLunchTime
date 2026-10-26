import type { HonourId } from '@lunch-campaign/content';
import {
  BLITZ,
  BUTCHERS_BILL,
  EMPIRE,
  FORAGER,
  GRANDE_ARMEE,
  IRON_DISCIPLINE,
  LAST_STAND,
  REARGUARD,
  SADDLE_UP,
  SPYMASTER,
  THE_FOX,
  THUNDER_OF_GUNS,
} from '@lunch-campaign/content';
import type { PlayerId, UnitType } from '@lunch-campaign/engine';
import {
  requirePresent,
  totalUnitCount,
  UNIT_TYPES,
} from '@lunch-campaign/engine';
import type { BattleRecord, BattleSideRecord } from './battle-records';
import { sideOf } from './battle-records';
import type { HonourContext } from './honour-context';
import {
  battlesOf,
  battlesWonBy,
  countBattlesWon,
  finalStandingOf,
  unitsDestroyedByBombardment,
  unitsLostInBattle,
} from './honour-context';
import { countOf, eventsOfType, sumOf } from './log-queries';

/** `most`: highest count wins, and a best count of 0 awards nobody. `fewest`: lowest count wins. */
export type HonourDirection = 'most' | 'fewest';

export interface HonourQuery {
  readonly direction: HonourDirection;
  readonly measure: (context: HonourContext, playerId: PlayerId) => number;
  readonly isEligible: (context: HonourContext, playerId: PlayerId) => boolean;
}

const EVERYONE = (): boolean => true;

/** Each honour is a query over the logs; none adds a rule. */
export const HONOUR_QUERIES: Readonly<Record<HonourId, HonourQuery>> = {
  [GRANDE_ARMEE]: {
    direction: 'most',
    measure: (context, playerId): number =>
      finalStandingOf(context, playerId).units,
    isEligible: EVERYONE,
  },
  [EMPIRE]: {
    direction: 'most',
    measure: (context, playerId): number =>
      finalStandingOf(context, playerId).zonesOwned,
    isEligible: EVERYONE,
  },
  [BUTCHERS_BILL]: {
    direction: 'most',
    measure: (context, playerId): number =>
      combatKillsCreditedTo(context, playerId) +
      unitsDestroyedByBombardment(context, playerId),
    isEligible: EVERYONE,
  },
  [IRON_DISCIPLINE]: {
    direction: 'fewest',
    measure: unitsLostInBattle,
    isEligible: (context, playerId): boolean =>
      battlesOf(context, playerId).length > 0,
  },
  [THE_FOX]: {
    direction: 'most',
    measure: (context, playerId): number =>
      countBattlesWon(context, playerId, (battle): boolean =>
        wasOutnumbered(battle, playerId),
      ),
    isEligible: EVERYONE,
  },
  [LAST_STAND]: {
    direction: 'most',
    measure: (context, playerId): number =>
      countBattlesWon(
        context,
        playerId,
        (battle): boolean => winningSide(battle, playerId).role === 'defender',
      ),
    isEligible: EVERYONE,
  },
  [SPYMASTER]: {
    direction: 'most',
    measure: (context, playerId): number =>
      countOf(
        context.record.spyLog,
        (entry): boolean => entry.playerId === playerId,
      ),
    isEligible: EVERYONE,
  },
  [THUNDER_OF_GUNS]: {
    direction: 'most',
    measure: unitsDestroyedByBombardment,
    isEligible: EVERYONE,
  },
  [SADDLE_UP]: {
    direction: 'most',
    measure: (context, playerId): number =>
      countBattlesWon(context, playerId, (battle): boolean =>
        isCavalryStrictlyLargest(winningSide(battle, playerId)),
      ),
    isEligible: EVERYONE,
  },
  [REARGUARD]: {
    direction: 'most',
    measure: (context, playerId): number =>
      sumOf(
        eventsOfType(context.record, 'Retreated')
          .filter((event): boolean => event.playerId === playerId)
          .map((event): number => totalUnitCount(event.units)),
      ),
    isEligible: EVERYONE,
  },
  [FORAGER]: {
    direction: 'most',
    measure: (context, playerId): number =>
      sumOf(
        eventsOfType(context.record, 'SupplyProduced')
          .filter((event): boolean => event.playerId === playerId)
          .map((event): number => event.amount),
      ),
    isEligible: EVERYONE,
  },
  [BLITZ]: {
    direction: 'most',
    measure: mostZonesCapturedInOneNight,
    isEligible: EVERYONE,
  },
};

/** In every battle a player wins, the units the losing sides lost in combat (retreats excluded). */
function combatKillsCreditedTo(
  context: HonourContext,
  playerId: PlayerId,
): number {
  return sumOf(
    battlesWonBy(context, playerId).flatMap((battle): readonly number[] =>
      battle.sides
        .filter((side): boolean => side.playerId !== playerId)
        .map((side): number => side.unitsLostInCombat),
    ),
  );
}

function winningSide(
  battle: BattleRecord,
  playerId: PlayerId,
): BattleSideRecord {
  return requirePresent(sideOf(battle, playerId), `side of ${playerId}`);
}

/** Fewer units than the largest enemy side, counted before bombardment. */
function wasOutnumbered(battle: BattleRecord, playerId: PlayerId): boolean {
  const ownUnits = totalUnitCount(winningSide(battle, playerId).unitsAtStart);
  const largestEnemy = Math.max(
    ...battle.sides
      .filter((side): boolean => side.playerId !== playerId)
      .map((side): number => totalUnitCount(side.unitsAtStart)),
  );
  return ownUnits < largestEnemy;
}

/** Cavalry outnumbers every other type, artillery included. */
function isCavalryStrictlyLargest(side: BattleSideRecord): boolean {
  return UNIT_TYPES.filter((unitType): boolean => unitType !== 'cavalry').every(
    (unitType: UnitType): boolean =>
      side.unitsAtStart.cavalry > side.unitsAtStart[unitType],
  );
}

function mostZonesCapturedInOneNight(
  context: HonourContext,
  playerId: PlayerId,
): number {
  const captureTurns = eventsOfType(context.record, 'ZoneCaptured')
    .filter((event): boolean => event.newOwnerId === playerId)
    .map((event): number => event.turnNumber);
  return Math.max(
    0,
    ...captureTurns.map((turn): number =>
      countOf(captureTurns, (other): boolean => other === turn),
    ),
  );
}
