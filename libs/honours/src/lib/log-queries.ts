import type {
  PlayerId,
  PlayerStanding,
  ReplayEvent,
} from '@lunch-campaign/engine';
import { EngineContractError } from '@lunch-campaign/engine';
import type { MatchRecord } from './match-record';

export type ReplayEventOfType<TType extends ReplayEvent['type']> = Extract<
  ReplayEvent,
  { readonly type: TType }
>;

export function eventsOfType<TType extends ReplayEvent['type']>(
  record: MatchRecord,
  type: TType,
): readonly ReplayEventOfType<TType>[] {
  return record.replayLog.filter(
    (event): event is ReplayEventOfType<TType> => event.type === type,
  );
}

/** The standings recorded at the end of the last resolved night. */
export function finalStandings(record: MatchRecord): readonly PlayerStanding[] {
  const recordings = eventsOfType(record, 'StandingsRecorded');
  const last = recordings[recordings.length - 1];
  if (last === undefined) {
    throw new EngineContractError(
      'The match record has no standings: no night has been resolved',
    );
  }
  return last.standings;
}

export function playerIds(record: MatchRecord): readonly PlayerId[] {
  return finalStandings(record).map((standing): PlayerId => standing.playerId);
}

export function sumOf(values: readonly number[]): number {
  return values.reduce((total, value): number => total + value, 0);
}

export function countOf<T>(
  items: readonly T[],
  matches: (item: T) => boolean,
): number {
  return items.filter(matches).length;
}
