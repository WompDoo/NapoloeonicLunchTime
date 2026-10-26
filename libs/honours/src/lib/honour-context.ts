import type { PlayerId, PlayerStanding } from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import type { BattleRecord } from './battle-records';
import { battleRecords, sideOf } from './battle-records';
import { countOf, eventsOfType, finalStandings, sumOf } from './log-queries';
import type { MatchRecord } from './match-record';

/** The match record with its battles joined once, shared by every query. */
export interface HonourContext {
  readonly record: MatchRecord;
  readonly battles: readonly BattleRecord[];
}

export function createHonourContext(record: MatchRecord): HonourContext {
  return { record, battles: battleRecords(record) };
}

export function finalStandingOf(
  context: HonourContext,
  playerId: PlayerId,
): PlayerStanding {
  return requirePresent(
    finalStandings(context.record).find(
      (standing): boolean => standing.playerId === playerId,
    ),
    `final standing of ${playerId}`,
  );
}

export function battlesOf(
  context: HonourContext,
  playerId: PlayerId,
): readonly BattleRecord[] {
  return context.battles.filter(
    (battle): boolean => sideOf(battle, playerId) !== undefined,
  );
}

export function battlesWonBy(
  context: HonourContext,
  playerId: PlayerId,
): readonly BattleRecord[] {
  return context.battles.filter(
    (battle): boolean => battle.winnerId === playerId,
  );
}

/** Units lost in battle: combat, head-on clashes and enemy bombardment, net of retreats. Typhus excluded. */
export function unitsLostInBattle(
  context: HonourContext,
  playerId: PlayerId,
): number {
  return sumOf(
    battlesOf(context, playerId).map(
      (battle): number =>
        requirePresent(sideOf(battle, playerId), 'battle side').unitsLost,
    ),
  );
}

export function unitsDestroyedByBombardment(
  context: HonourContext,
  playerId: PlayerId,
): number {
  return sumOf(
    eventsOfType(context.record, 'Bombardment')
      .filter((event): boolean => event.playerId === playerId)
      .map((event): number => event.hits.length),
  );
}

export function countBattlesWon(
  context: HonourContext,
  playerId: PlayerId,
  condition: (battle: BattleRecord) => boolean,
): number {
  return countOf(battlesWonBy(context, playerId), condition);
}
