import type { CombatRules, MatchConfig } from '../lib/config/match-config';
import { createUnitCounts } from '../lib/core/unit-counts';
import type { MultiplierMatrix } from '../lib/core/unit-types';
import { TEST_MAP } from './test-map';

const NEUTRAL = 1;
const COUNTER = 2;

/** The spec's default offense matrix (attacker row, target column). */
export const TEST_OFFENSE: MultiplierMatrix = {
  line: {
    line: NEUTRAL,
    cavalry: COUNTER,
    skirmishers: NEUTRAL,
    artillery: NEUTRAL,
  },
  cavalry: {
    line: NEUTRAL,
    cavalry: NEUTRAL,
    skirmishers: COUNTER,
    artillery: NEUTRAL,
  },
  skirmishers: {
    line: COUNTER,
    cavalry: NEUTRAL,
    skirmishers: NEUTRAL,
    artillery: NEUTRAL,
  },
  artillery: {
    line: NEUTRAL,
    cavalry: NEUTRAL,
    skirmishers: NEUTRAL,
    artillery: NEUTRAL,
  },
};

const NEUTRAL_ROW = {
  line: NEUTRAL,
  cavalry: NEUTRAL,
  skirmishers: NEUTRAL,
  artillery: NEUTRAL,
};

export const TEST_VULNERABILITY: MultiplierMatrix = {
  line: NEUTRAL_ROW,
  cavalry: NEUTRAL_ROW,
  skirmishers: NEUTRAL_ROW,
  artillery: NEUTRAL_ROW,
};

export const TEST_COMBAT_RULES: CombatRules = {
  baseStrength: { line: 1, cavalry: 1, skirmishers: 1, artillery: 0.5 },
  offense: TEST_OFFENSE,
  vulnerability: TEST_VULNERABILITY,
  defenderBonus: 0.25,
  winnerLossRatio: 0.5,
  casualtyRemovalOrder: [['line', 'skirmishers', 'cavalry'], ['artillery']],
};

/** Mirrors the spec's default tuning values on the 3×3 test map. */
export const TEST_CONFIG: MatchConfig = {
  map: TEST_MAP,
  startingUnits: createUnitCounts({
    line: 3,
    cavalry: 2,
    skirmishers: 2,
    artillery: 1,
  }),
  economy: {
    startingSupply: 6,
    productionByZoneKind: { plain: 1, city: 2, capital: 3 },
    recruitCost: { line: 2, cavalry: 3, skirmishers: 2, artillery: 4 },
  },
  combat: TEST_COMBAT_RULES,
  orders: { maxMoveOrdersPerTurn: 5 },
  schedule: [
    { label: 'Monday', scoring: [] },
    { label: 'Tuesday', scoring: [] },
    { label: 'Wednesday', scoring: [{ kind: 'cityPoints', pointsPerCity: 3 }] },
    { label: 'Thursday', scoring: [] },
    { label: 'Friday', scoring: [{ kind: 'cityPoints', pointsPerCity: 6 }] },
  ],
};
