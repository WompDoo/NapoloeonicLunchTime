import { requirePresent } from '../lib/core/engine-error';
import type { MatchConfig } from '../lib/config/match-config';
import type { PlayerOrders } from '../lib/orders/orders';
import { validateTurnOrders } from '../lib/orders/validate-orders';
import type {
  ResolutionState,
  TurnContext,
} from '../lib/resolution/resolution-state';
import type { MatchState } from '../lib/state/match-state';

/** Builds the context `resolveTurn` would build, so single phases can be tested in isolation. */
export function createTestContext(
  state: MatchState,
  submissions: readonly PlayerOrders[],
  config: MatchConfig,
): TurnContext {
  return {
    config,
    turnNumber: state.turnNumber,
    scheduleEntry: requirePresent(
      config.schedule[state.turnNumber - 1],
      'schedule entry',
    ),
    acceptedOrders: validateTurnOrders(state, submissions, config).accepted,
  };
}

export function startResolution(state: MatchState): ResolutionState {
  return { match: state, replayLog: [] };
}
