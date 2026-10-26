import type { EventDefinition } from '@lunch-campaign/engine';
import {
  AFTER_CORE_STEP,
  BEFORE_CORE_STEP,
  DEFAULT_MODIFIER_PRIORITY,
} from './step-priorities';

export const MUD = 'mud';
export const FOG = 'fog';
export const TYPHUS = 'typhus';
export const LEVEE_EN_MASSE = 'levee-en-masse';
export const ARMISTICE = 'armistice';

const NEUTRAL_MULTIPLIER = 1;
const IMMOBILE = 0;
const TYPHUS_LOSS_FRACTION = 0.2;
const TYPHUS_MINIMUM_ARMY_SIZE_FOR_MINIMUM_LOSS = 2;
const TYPHUS_MINIMUM_LOSS = 1;
const LEVEE_LINE_INFANTRY = 3;

/** One is drawn per match with the match seed, announced at Tuesday's resolution, active on Wednesday. */
export const DEFAULT_EVENTS: readonly EventDefinition[] = [
  {
    id: MUD,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'matrixCell',
          parameter: 'offense',
          row: 'cavalry',
          column: 'skirmishers',
          operation: 'set',
          value: NEUTRAL_MULTIPLIER,
        },
        {
          kind: 'unitTypeNumber',
          parameter: 'moveRange',
          unitType: 'artillery',
          operation: 'set',
          value: IMMOBILE,
        },
      ],
      phaseSteps: [],
    },
  },
  {
    id: FOG,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        { kind: 'flag', parameter: 'spiesAvailable', value: false },
        { kind: 'flag', parameter: 'unitCountsVisible', value: false },
      ],
      phaseSteps: [],
    },
  },
  {
    id: TYPHUS,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [],
      phaseSteps: [
        {
          phase: 'production',
          priority: BEFORE_CORE_STEP,
          action: {
            kind: 'reduceLargestArmy',
            lossFraction: TYPHUS_LOSS_FRACTION,
            minimumArmySizeForMinimumLoss:
              TYPHUS_MINIMUM_ARMY_SIZE_FOR_MINIMUM_LOSS,
            minimumLoss: TYPHUS_MINIMUM_LOSS,
          },
        },
      ],
    },
  },
  {
    id: LEVEE_EN_MASSE,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [],
      phaseSteps: [
        {
          phase: 'purchase',
          priority: AFTER_CORE_STEP,
          action: {
            kind: 'grantFreeUnits',
            units: {
              line: LEVEE_LINE_INFANTRY,
              cavalry: 0,
              skirmishers: 0,
              artillery: 0,
            },
          },
        },
      ],
    },
  },
  {
    id: ARMISTICE,
    effect: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      // No combat or bombardment follows: with every contested move bounced, no zone ever holds two players.
      patches: [
        {
          kind: 'flag',
          parameter: 'foreignAndContestedMovesBounce',
          value: true,
        },
      ],
      phaseSteps: [],
    },
  },
];
