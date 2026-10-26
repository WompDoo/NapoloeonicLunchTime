import type { MatchConfig, TurnScheduleEntry } from '../config/match-config';
import type { AcceptedOrders } from '../orders/orders';
import type { ReplayEvent } from '../replay/replay-events';
import type { MatchState } from '../state/match-state';

/** Everything a phase needs besides the state it transforms. Built once per turn. */
export interface TurnContext {
  readonly config: MatchConfig;
  readonly turnNumber: number;
  readonly scheduleEntry: TurnScheduleEntry;
  /** Sorted by seat. */
  readonly acceptedOrders: readonly AcceptedOrders[];
}

export interface ResolutionState {
  readonly match: MatchState;
  readonly replayLog: readonly ReplayEvent[];
}

export type PhaseStep = (
  resolution: ResolutionState,
  context: TurnContext,
) => ResolutionState;

export function appendEvents(
  resolution: ResolutionState,
  match: MatchState,
  events: readonly ReplayEvent[],
): ResolutionState {
  return { match, replayLog: [...resolution.replayLog, ...events] };
}
