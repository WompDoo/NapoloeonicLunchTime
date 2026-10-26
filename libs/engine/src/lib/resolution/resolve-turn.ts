import { EngineContractError } from '../core/engine-error';
import type { MatchConfig, TurnScheduleEntry } from '../config/match-config';
import type { OrderRejection, PlayerOrders } from '../orders/orders';
import { validateTurnOrders } from '../orders/validate-orders';
import type { OrderRejectedEvent, ReplayEvent } from '../replay/replay-events';
import type { MatchState } from '../state/match-state';
import { CORE_PHASE_STEPS } from './core-phase-steps';
import type { ResolutionState, TurnContext } from './resolution-state';
import { RESOLUTION_ORDER } from './resolution-state';

export interface TurnResult {
  readonly state: MatchState;
  readonly replayLog: readonly ReplayEvent[];
}

/**
 * Resolves one night: validates every player's orders against the current state, then runs the phases in
 * `RESOLUTION_ORDER`. Pure and deterministic: the same inputs always give the same output.
 */
export function resolveTurn(
  state: MatchState,
  orders: readonly PlayerOrders[],
  config: MatchConfig,
): TurnResult {
  const scheduleEntry = findScheduleEntry(config, state.turnNumber);
  const validation = validateTurnOrders(state, orders, config);
  const context: TurnContext = {
    config,
    turnNumber: state.turnNumber,
    scheduleEntry,
    acceptedOrders: validation.accepted,
  };
  const initial: ResolutionState = {
    match: state,
    replayLog: validation.rejections.map(
      (rejection): OrderRejectedEvent =>
        toOrderRejectedEvent(rejection, state.turnNumber),
    ),
  };
  const resolved = RESOLUTION_ORDER.reduce(
    (resolution, phase): ResolutionState =>
      CORE_PHASE_STEPS[phase](resolution, context),
    initial,
  );
  return { state: resolved.match, replayLog: resolved.replayLog };
}

export function isMatchFinished(
  state: MatchState,
  config: MatchConfig,
): boolean {
  return state.turnNumber > config.schedule.length;
}

function findScheduleEntry(
  config: MatchConfig,
  turnNumber: number,
): TurnScheduleEntry {
  const entry = config.schedule[turnNumber - 1];
  if (entry === undefined) {
    throw new EngineContractError(
      `Turn ${turnNumber} is not on the schedule: the match is finished`,
    );
  }
  return entry;
}

function toOrderRejectedEvent(
  rejection: OrderRejection,
  turnNumber: number,
): OrderRejectedEvent {
  return { type: 'OrderRejected', turnNumber, ...rejection };
}
