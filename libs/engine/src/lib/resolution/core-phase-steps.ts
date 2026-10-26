import { applyCapturePhase } from './phases/capture-phase';
import { applyCombatPhase } from './phases/combat-phase';
import { applyMovementPhase } from './phases/movement-phase';
import { applyProductionPhase } from './phases/production-phase';
import { applyPurchasePhase } from './phases/purchase-phase';
import { applyScoringPhase } from './phases/scoring-phase';
import type {
  PhaseStep,
  ResolutionPhase,
  ResolutionState,
  TurnContext,
} from './resolution-state';

/** Reinforcement has no core behaviour and bombardment arrives with support orders (Milestone 2). */
function leaveUnchanged(resolution: ResolutionState): ResolutionState {
  return resolution;
}

function applyCleanupPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  return {
    ...resolution,
    match: { ...resolution.match, turnNumber: context.turnNumber + 1 },
  };
}

export const CORE_PHASE_STEPS: Readonly<Record<ResolutionPhase, PhaseStep>> = {
  purchase: applyPurchasePhase,
  movement: applyMovementPhase,
  reinforcement: leaveUnchanged,
  bombardment: leaveUnchanged,
  combat: applyCombatPhase,
  capture: applyCapturePhase,
  production: applyProductionPhase,
  scoring: applyScoringPhase,
  cleanup: applyCleanupPhase,
};
