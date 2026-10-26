import type {
  AbilityDefinition,
  CommanderDefinition,
  EventDefinition,
  ModifierEffect,
  UpgradeDefinition,
} from '../lib/modifiers/modifier-definitions';

/*
 * Generic test content. Names are deliberately not the real commanders, upgrades and events: engine tests
 * prove mechanisms (patches, phase steps, ordering); libs/content tests prove the real content.
 */

export const NO_EFFECT: ModifierEffect = {
  priority: 0,
  patches: [],
  phaseSteps: [],
};

function ability(definition: Partial<AbilityDefinition>): AbilityDefinition {
  return {
    id: 'nothing',
    targetKind: 'none',
    scope: 'owner',
    durationInNights: 1,
    effect: NO_EFFECT,
    ...definition,
  };
}

export const TEST_COMMANDERS: readonly CommanderDefinition[] = [
  { id: 'plain', passive: NO_EFFECT, ability: ability({}) },
  {
    id: 'marshal',
    passive: NO_EFFECT,
    ability: ability({
      id: 'forward',
      targetKind: 'reinforcement',
      effect: {
        priority: 0,
        patches: [],
        phaseSteps: [
          {
            phase: 'reinforcement',
            priority: 100,
            action: { kind: 'joinAdjacentBattle' },
          },
        ],
      },
    }),
  },
  {
    id: 'warden',
    passive: {
      priority: 0,
      patches: [{ kind: 'addStrengthBonus', role: 'defender', value: 0.1 }],
      phaseSteps: [],
    },
    ability: ability({
      id: 'hold',
      targetKind: 'ownedZone',
      effect: {
        priority: 0,
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
            value: 2,
            onlyInTargetZone: true,
          },
        ],
        phaseSteps: [],
      },
    }),
  },
  {
    id: 'blight',
    passive: NO_EFFECT,
    ability: ability({
      id: 'scorch',
      targetKind: 'ownedZone',
      scope: 'everyone',
      durationInNights: 2,
      effect: {
        priority: 0,
        patches: [
          {
            kind: 'number',
            parameter: 'productionFactor',
            operation: 'set',
            value: 0,
            onlyInTargetZone: true,
          },
        ],
        phaseSteps: [],
      },
    }),
  },
  {
    id: 'gunner',
    passive: {
      priority: 0,
      patches: [
        {
          kind: 'number',
          parameter: 'bombardmentHitsPerArtillery',
          operation: 'add',
          value: 1,
        },
      ],
      phaseSteps: [],
    },
    ability: ability({
      id: 'barrage',
      effect: {
        priority: 0,
        patches: [
          {
            kind: 'number',
            parameter: 'bombardmentVolleys',
            operation: 'multiply',
            value: 2,
          },
        ],
        phaseSteps: [],
      },
    }),
  },
  {
    id: 'charger',
    passive: {
      priority: 0,
      patches: [
        {
          kind: 'unitTypeNumber',
          parameter: 'moveRange',
          unitType: 'cavalry',
          operation: 'set',
          value: 2,
        },
      ],
      phaseSteps: [],
    },
    ability: ability({
      id: 'charge',
      effect: {
        priority: 0,
        patches: [
          {
            kind: 'addUnitTypes',
            parameter: 'defenderBonusSuppressorTypes',
            unitTypes: ['cavalry'],
          },
        ],
        phaseSteps: [],
      },
    }),
  },
];

export const TEST_UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: 'retreat',
    effect: {
      priority: 0,
      patches: [{ kind: 'flag', parameter: 'orderlyRetreat', value: true }],
      phaseSteps: [],
    },
  },
  {
    id: 'drill',
    effect: {
      priority: 0,
      patches: [
        {
          kind: 'matrixCell',
          parameter: 'vulnerability',
          row: 'line',
          column: 'skirmishers',
          operation: 'set',
          value: 0.5,
        },
      ],
      phaseSteps: [],
    },
  },
];

export const TEST_EVENTS: readonly EventDefinition[] = [
  {
    id: 'levy',
    effect: {
      priority: 0,
      patches: [],
      phaseSteps: [
        {
          phase: 'purchase',
          priority: 150,
          action: {
            kind: 'grantFreeUnits',
            units: { line: 3, cavalry: 0, skirmishers: 0, artillery: 0 },
          },
        },
      ],
    },
  },
  {
    id: 'plague',
    effect: {
      priority: 0,
      patches: [],
      phaseSteps: [
        {
          phase: 'production',
          priority: 50,
          action: {
            kind: 'reduceLargestArmy',
            lossFraction: 0.2,
            minimumArmySizeForMinimumLoss: 2,
            minimumLoss: 1,
          },
        },
      ],
    },
  },
  {
    id: 'truce',
    effect: {
      priority: 0,
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
