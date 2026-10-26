import type { UnitCounts } from '../core/unit-types';
import type { ResolutionPhase } from '../resolution/resolution-phases';
import type { AbilityTargetKind } from './ability-target';
import type { ParameterPatch } from './parameter-patches';

/**
 * Behaviour a modifier adds at a specific phase. Each kind is implemented once in the engine; content
 * supplies the numbers. A new event needs data and, at most, one new kind here.
 */
export type PhaseStepAction =
  | { readonly kind: 'grantFreeUnits'; readonly units: UnitCounts }
  | {
      readonly kind: 'reduceLargestArmy';
      readonly lossFraction: number;
      /** Armies of at least this size always lose at least `minimumLoss` units. */
      readonly minimumArmySizeForMinimumLoss: number;
      readonly minimumLoss: number;
    }
  | { readonly kind: 'joinAdjacentBattle' };

export interface PhaseStepDefinition {
  readonly phase: ResolutionPhase;
  /** Steps in a phase run in priority order (core steps run at `CORE_STEP_PRIORITY`), then by seat. */
  readonly priority: number;
  readonly action: PhaseStepAction;
}

export interface ModifierEffect {
  /** Patches of all active modifiers apply in priority order, then by seat, then by modifier id. */
  readonly priority: number;
  readonly patches: readonly ParameterPatch[];
  readonly phaseSteps: readonly PhaseStepDefinition[];
}

export interface UpgradeDefinition {
  readonly id: string;
  readonly effect: ModifierEffect;
}

/** `owner`: the ability changes its user's parameters. `everyone`: it changes everyone's (Scorched Earth). */
export type AbilityScope = 'owner' | 'everyone';

export interface AbilityDefinition {
  readonly id: string;
  readonly targetKind: AbilityTargetKind;
  readonly scope: AbilityScope;
  /** Nights the ability lasts, starting with the night it is used. */
  readonly durationInNights: number;
  readonly effect: ModifierEffect;
}

export interface CommanderDefinition {
  readonly id: string;
  readonly passive: ModifierEffect;
  readonly ability: AbilityDefinition;
}

export interface EventDefinition {
  readonly id: string;
  readonly effect: ModifierEffect;
}
