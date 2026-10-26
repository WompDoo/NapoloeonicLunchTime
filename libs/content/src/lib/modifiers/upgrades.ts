import type { UpgradeDefinition } from '@lunch-campaign/engine';
import { DEFAULT_MODIFIER_PRIORITY } from './step-priorities';

export const ORDERLY_RETREAT = 'orderly-retreat';
export const BAYONET_DRILL = 'bayonet-drill';
export const LANCERS = 'lancers';

/** Vulnerability that turns a doubled counter hit back into a normal one. */
const COUNTER_NEUTRALISING_VULNERABILITY = 0.5;

/** Upgrades bend the triangle rather than add raw strength. Bought once each, permanent, public. */
export const DEFAULT_UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: ORDERLY_RETREAT,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [{ kind: 'flag', parameter: 'orderlyRetreat', value: true }],
      phaseSteps: [],
    },
  },
  {
    id: BAYONET_DRILL,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'matrixCell',
          parameter: 'vulnerability',
          row: 'line',
          column: 'skirmishers',
          operation: 'set',
          value: COUNTER_NEUTRALISING_VULNERABILITY,
        },
      ],
      phaseSteps: [],
    },
  },
  {
    id: LANCERS,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'matrixCell',
          parameter: 'vulnerability',
          row: 'cavalry',
          column: 'line',
          operation: 'set',
          value: COUNTER_NEUTRALISING_VULNERABILITY,
        },
      ],
      phaseSteps: [],
    },
  },
];
