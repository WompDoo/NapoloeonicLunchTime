import type { ActiveModifier } from '../../modifiers/active-modifiers';
import type { PhaseStepAction } from '../../modifiers/modifier-definitions';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { applyGrantFreeUnits } from './grant-free-units';
import { applyJoinAdjacentBattle } from './join-adjacent-battle';
import { applyReduceLargestArmy } from './reduce-largest-army';

type PhaseStepActionRunner<TAction extends PhaseStepAction> = (
  resolution: ResolutionState,
  context: TurnContext,
  modifier: ActiveModifier,
  action: TAction,
) => ResolutionState;

type PhaseStepActionRunners = {
  readonly [TKind in PhaseStepAction['kind']]: PhaseStepActionRunner<
    Extract<PhaseStepAction, { readonly kind: TKind }>
  >;
};

/** The behaviours modifiers can add to a phase. A new kind of behaviour is one new entry here. */
const PHASE_STEP_ACTION_RUNNERS: PhaseStepActionRunners = {
  grantFreeUnits: applyGrantFreeUnits,
  reduceLargestArmy: applyReduceLargestArmy,
  joinAdjacentBattle: applyJoinAdjacentBattle,
};

export function runPhaseStepAction(
  resolution: ResolutionState,
  context: TurnContext,
  modifier: ActiveModifier,
  action: PhaseStepAction,
): ResolutionState {
  const runner = PHASE_STEP_ACTION_RUNNERS[
    action.kind
  ] as PhaseStepActionRunner<PhaseStepAction>;
  return runner(resolution, context, modifier, action);
}
