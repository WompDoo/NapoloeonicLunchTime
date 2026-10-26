import { compareByCodeUnitOrder } from '../core/ids';
import { compareInOrder } from '../core/ordering';
import type { MatchConfig } from '../config/match-config';
import type { ActiveModifier } from '../modifiers/active-modifiers';
import {
  activeModifiersInOrder,
  findModifierEffect,
  seatOfModifier,
} from '../modifiers/active-modifiers';
import type { PhaseStepDefinition } from '../modifiers/modifier-definitions';
import type { MatchState } from '../state/match-state';
import { CORE_PHASE_STEPS } from './core-phase-steps';
import { runPhaseStepAction } from './modifier-steps/phase-step-actions';
import type { ResolutionPhase } from './resolution-phases';
import type {
  PhaseStep,
  ResolutionState,
  TurnContext,
} from './resolution-state';

/** Core phase steps run at this priority; modifier steps go before (lower) or after (higher) them. */
export const CORE_STEP_PRIORITY = 100;
const CORE_STEP_SEAT = 0;
const CORE_STEP_KEY = 'core';

interface ScheduledStep {
  readonly priority: number;
  readonly seat: number;
  readonly key: string;
  readonly run: PhaseStep;
}

const compareScheduledSteps = compareInOrder<ScheduledStep>([
  (left, right): number => left.priority - right.priority,
  (left, right): number => left.seat - right.seat,
  (left, right): number => compareByCodeUnitOrder(left.key, right.key),
]);

/**
 * Runs one phase: the core step plus every step active modifiers add to this phase, ordered by priority,
 * then by the owner's seat, then by modifier id. Modifier steps are collected when the phase starts.
 */
export function runPhase(
  resolution: ResolutionState,
  phase: ResolutionPhase,
  context: TurnContext,
): ResolutionState {
  const coreStep: ScheduledStep = {
    priority: CORE_STEP_PRIORITY,
    seat: CORE_STEP_SEAT,
    key: CORE_STEP_KEY,
    run: CORE_PHASE_STEPS[phase],
  };
  return [coreStep, ...modifierSteps(resolution.match, context.config, phase)]
    .toSorted(compareScheduledSteps)
    .reduce(
      (current, step): ResolutionState => step.run(current, context),
      resolution,
    );
}

function modifierSteps(
  state: MatchState,
  config: MatchConfig,
  phase: ResolutionPhase,
): readonly ScheduledStep[] {
  return activeModifiersInOrder(state, config).flatMap(
    (modifier): readonly ScheduledStep[] =>
      findModifierEffect(config, modifier.source)
        .phaseSteps.filter((step): boolean => step.phase === phase)
        .map(
          (step, index): ScheduledStep =>
            scheduleModifierStep(state, modifier, step, index),
        ),
  );
}

function scheduleModifierStep(
  state: MatchState,
  modifier: ActiveModifier,
  step: PhaseStepDefinition,
  index: number,
): ScheduledStep {
  return {
    priority: step.priority,
    seat: seatOfModifier(state, modifier),
    key: `${modifier.id}#${index}`,
    run: (resolution, context): ResolutionState =>
      runPhaseStepAction(resolution, context, modifier, step.action),
  };
}
