import type { BattleResult, BattleSideResult } from '../lib/combat/battle';
import { requirePresent } from '../lib/core/engine-error';
import type { PlayerId } from '../lib/core/ids';
import type { ReplayEvent } from '../lib/replay/replay-events';

export type ReplayEventOfType<TType extends ReplayEvent['type']> = Extract<
  ReplayEvent,
  { readonly type: TType }
>;

export function eventsOfType<TType extends ReplayEvent['type']>(
  replayLog: readonly ReplayEvent[],
  type: TType,
): readonly ReplayEventOfType<TType>[] {
  return replayLog.filter(
    (event): event is ReplayEventOfType<TType> => event.type === type,
  );
}

export function firstEventOfType<TType extends ReplayEvent['type']>(
  replayLog: readonly ReplayEvent[],
  type: TType,
): ReplayEventOfType<TType> {
  return requirePresent(eventsOfType(replayLog, type)[0], `${type} event`);
}

export function sideOf(
  battle: BattleResult,
  playerId: PlayerId,
): BattleSideResult {
  return requirePresent(
    battle.sides.find((side): boolean => side.playerId === playerId),
    `battle side of ${playerId}`,
  );
}
