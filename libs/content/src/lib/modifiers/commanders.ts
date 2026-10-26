import type { CommanderDefinition } from '@lunch-campaign/engine';
import { AFTER_CORE_STEP, DEFAULT_MODIFIER_PRIORITY } from './step-priorities';

export const NAPOLEON = 'napoleon';
export const WELLINGTON = 'wellington';
export const MURAT = 'murat';
export const BLUCHER = 'blucher';
export const KUTUZOV = 'kutuzov';
export const SIR_JOHN_MOORE = 'moore';

const NAPOLEON_EXTRA_BOMBARDMENT_HITS = 1;
const GRAND_BATTERY_VOLLEY_MULTIPLIER = 2;
const WELLINGTON_DEFENDER_BONUS = 0.1;
const REVERSE_SLOPE_DEFENDER_BONUS_MULTIPLIER = 2;
const MURAT_CAVALRY_MOVE_RANGE = 2;
const BLUCHER_ATTACK_BONUS = 0.1;
const SCORCHED_EARTH_NIGHTS = 2;
const SCORCHED_PRODUCTION_FACTOR = 0;
const AMBUSH_SKIRMISHER_DAMAGE_MULTIPLIER = 2;
const AMBUSH_SKIRMISHER_VULNERABILITY_TO_CAVALRY = 0.5;
const ONE_NIGHT = 1;

/** Each player picks one before the match; duplicates are allowed. Abilities are used once per match. */
export const DEFAULT_COMMANDERS: readonly CommanderDefinition[] = [
  {
    id: NAPOLEON,
    passive: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'number',
          parameter: 'bombardmentHitsPerArtillery',
          operation: 'add',
          value: NAPOLEON_EXTRA_BOMBARDMENT_HITS,
        },
      ],
      phaseSteps: [],
    },
    ability: {
      id: 'grand-battery',
      targetKind: 'none',
      scope: 'owner',
      durationInNights: ONE_NIGHT,
      effect: {
        priority: DEFAULT_MODIFIER_PRIORITY,
        patches: [
          {
            kind: 'number',
            parameter: 'bombardmentVolleys',
            operation: 'multiply',
            value: GRAND_BATTERY_VOLLEY_MULTIPLIER,
          },
        ],
        phaseSteps: [],
      },
    },
  },
  {
    id: WELLINGTON,
    passive: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'addStrengthBonus',
          role: 'defender',
          value: WELLINGTON_DEFENDER_BONUS,
        },
      ],
      phaseSteps: [],
    },
    ability: {
      id: 'reverse-slope',
      targetKind: 'ownedZone',
      scope: 'owner',
      durationInNights: ONE_NIGHT,
      effect: {
        priority: DEFAULT_MODIFIER_PRIORITY,
        patches: [
          {
            kind: 'flag',
            parameter: 'shieldedFromEnemyBombardment',
            value: true,
            onlyInTargetZone: true,
          },
          {
            kind: 'number',
            parameter: 'defenderBonus',
            operation: 'multiply',
            value: REVERSE_SLOPE_DEFENDER_BONUS_MULTIPLIER,
            onlyInTargetZone: true,
          },
        ],
        phaseSteps: [],
      },
    },
  },
  {
    id: MURAT,
    passive: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'unitTypeNumber',
          parameter: 'moveRange',
          unitType: 'cavalry',
          operation: 'set',
          value: MURAT_CAVALRY_MOVE_RANGE,
        },
      ],
      phaseSteps: [],
    },
    ability: {
      id: 'grand-charge',
      targetKind: 'none',
      scope: 'owner',
      durationInNights: ONE_NIGHT,
      effect: {
        priority: DEFAULT_MODIFIER_PRIORITY,
        patches: [
          {
            kind: 'addUnitTypes',
            parameter: 'defenderBonusSuppressorTypes',
            unitTypes: ['cavalry'],
          },
        ],
        phaseSteps: [],
      },
    },
  },
  {
    id: BLUCHER,
    passive: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'addStrengthBonus',
          role: 'attacker',
          value: BLUCHER_ATTACK_BONUS,
        },
      ],
      phaseSteps: [],
    },
    ability: {
      id: 'marschall-vorwarts',
      targetKind: 'reinforcement',
      scope: 'owner',
      durationInNights: ONE_NIGHT,
      effect: {
        priority: DEFAULT_MODIFIER_PRIORITY,
        patches: [],
        phaseSteps: [
          {
            phase: 'reinforcement',
            priority: AFTER_CORE_STEP,
            action: { kind: 'joinAdjacentBattle' },
          },
        ],
      },
    },
  },
  {
    id: KUTUZOV,
    passive: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [{ kind: 'flag', parameter: 'orderlyRetreat', value: true }],
      phaseSteps: [],
    },
    ability: {
      id: 'scorched-earth',
      targetKind: 'ownedZone',
      scope: 'everyone',
      durationInNights: SCORCHED_EARTH_NIGHTS,
      effect: {
        priority: DEFAULT_MODIFIER_PRIORITY,
        patches: [
          {
            kind: 'number',
            parameter: 'productionFactor',
            operation: 'set',
            value: SCORCHED_PRODUCTION_FACTOR,
            onlyInTargetZone: true,
          },
        ],
        phaseSteps: [],
      },
    },
  },
  {
    id: SIR_JOHN_MOORE,
    passive: {
      priority: DEFAULT_MODIFIER_PRIORITY,
      patches: [
        {
          kind: 'addUnitTypes',
          parameter: 'spyHiddenUnitTypes',
          unitTypes: ['skirmishers'],
        },
      ],
      phaseSteps: [],
    },
    ability: {
      id: 'ambush',
      targetKind: 'none',
      scope: 'owner',
      durationInNights: ONE_NIGHT,
      effect: {
        priority: DEFAULT_MODIFIER_PRIORITY,
        patches: [
          {
            kind: 'matrixCell',
            parameter: 'offense',
            row: 'skirmishers',
            column: 'cavalry',
            operation: 'multiply',
            value: AMBUSH_SKIRMISHER_DAMAGE_MULTIPLIER,
          },
          {
            kind: 'matrixCell',
            parameter: 'vulnerability',
            row: 'skirmishers',
            column: 'cavalry',
            operation: 'set',
            value: AMBUSH_SKIRMISHER_VULNERABILITY_TO_CAVALRY,
          },
        ],
        phaseSteps: [],
      },
    },
  },
];
