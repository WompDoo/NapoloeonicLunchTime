import { applyBombardmentPhase } from './phases/bombardment-phase';
import { applyCapturePhase } from './phases/capture-phase';
import { applyCleanupPhase } from './phases/cleanup-phase';
import { applyCombatPhase } from './phases/combat-phase';
import { applyMovementPhase } from './phases/movement-phase';
import { applyProductionPhase } from './phases/production-phase';
import { applyPurchasePhase } from './phases/purchase-phase';
import { applyScoringPhase } from './phases/scoring-phase';
import type { ResolutionPhase } from './resolution-phases';
import type { PhaseStep, ResolutionState } from './resolution-state';

/** Reinforcement has no core behaviour; only modifier steps (Marschall Vorwärts) act there. */
function leaveUnchanged(resolution: ResolutionState): ResolutionState {
  return resolution;
}

export const CORE_PHASE_STEPS: Readonly<Record<ResolutionPhase, PhaseStep>> = {
  purchase: applyPurchasePhase,
  movement: applyMovementPhase,
  reinforcement: leaveUnchanged,
  bombardment: applyBombardmentPhase,
  combat: applyCombatPhase,
  capture: applyCapturePhase,
  production: applyProductionPhase,
  scoring: applyScoringPhase,
  cleanup: applyCleanupPhase,
};
