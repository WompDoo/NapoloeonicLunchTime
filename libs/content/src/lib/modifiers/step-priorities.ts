import { CORE_STEP_PRIORITY } from '@lunch-campaign/engine';

/** Phase-step priorities relative to each phase's core step. */
export const BEFORE_CORE_STEP = CORE_STEP_PRIORITY - 1;
export const AFTER_CORE_STEP = CORE_STEP_PRIORITY + 1;

/** Patch application order. Every default modifier patches distinct parameters, so one level suffices. */
export const DEFAULT_MODIFIER_PRIORITY = 0;
