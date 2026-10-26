import type {
  CombatRules,
  EconomyRules,
  MatchConfig,
  MultiplierMatrix,
  OrderRules,
  TurnScheduleEntry,
  UnitCounts,
  UnitTypeRecord,
} from '@lunch-campaign/engine';
import { V0_FOUR_PLAYER_MAP } from '../maps/v0-four-player-map';

/*
 * Default tuning values from docs/spec.md ("Default tuning values"). These are starting guesses for the
 * playtest: tune them here, and only here.
 */

/** Damage multiplier when a unit attacks the type it beats in the triangle. */
const COUNTER_MULTIPLIER = 2;
const NEUTRAL_MULTIPLIER = 1;
const NORMAL_VULNERABILITY = 1;

const NEUTRAL_OFFENSE_ROW: UnitTypeRecord<number> = {
  line: NEUTRAL_MULTIPLIER,
  cavalry: NEUTRAL_MULTIPLIER,
  skirmishers: NEUTRAL_MULTIPLIER,
  artillery: NEUTRAL_MULTIPLIER,
};

/** Attacker row, target column: line beats cavalry, cavalry beats skirmishers, skirmishers beat line. */
export const DEFAULT_OFFENSE_MATRIX: MultiplierMatrix = {
  line: { ...NEUTRAL_OFFENSE_ROW, cavalry: COUNTER_MULTIPLIER },
  cavalry: { ...NEUTRAL_OFFENSE_ROW, skirmishers: COUNTER_MULTIPLIER },
  skirmishers: { ...NEUTRAL_OFFENSE_ROW, line: COUNTER_MULTIPLIER },
  artillery: NEUTRAL_OFFENSE_ROW,
};

const NORMAL_VULNERABILITY_ROW: UnitTypeRecord<number> = {
  line: NORMAL_VULNERABILITY,
  cavalry: NORMAL_VULNERABILITY,
  skirmishers: NORMAL_VULNERABILITY,
  artillery: NORMAL_VULNERABILITY,
};

/** Target row, attacker column. All 1 by default; upgrades patch their owner's copy. */
export const DEFAULT_VULNERABILITY_MATRIX: MultiplierMatrix = {
  line: NORMAL_VULNERABILITY_ROW,
  cavalry: NORMAL_VULNERABILITY_ROW,
  skirmishers: NORMAL_VULNERABILITY_ROW,
  artillery: NORMAL_VULNERABILITY_ROW,
};

export const DEFAULT_COMBAT_RULES: CombatRules = {
  baseStrength: { line: 1, cavalry: 1, skirmishers: 1, artillery: 0.5 },
  offense: DEFAULT_OFFENSE_MATRIX,
  vulnerability: DEFAULT_VULNERABILITY_MATRIX,
  defenderBonus: 0.25,
  winnerLossRatio: 0.5,
  casualtyRemovalOrder: [['line', 'skirmishers', 'cavalry'], ['artillery']],
};

export const DEFAULT_ECONOMY_RULES: EconomyRules = {
  startingSupply: 6,
  productionByZoneKind: { plain: 1, city: 2, capital: 3 },
  recruitCost: { line: 2, cavalry: 3, skirmishers: 2, artillery: 4 },
};

export const DEFAULT_STARTING_UNITS: UnitCounts = {
  line: 3,
  cavalry: 2,
  skirmishers: 2,
  artillery: 1,
};

export const DEFAULT_ORDER_RULES: OrderRules = { maxMoveOrdersPerTurn: 5 };

/** One working week: five resolutions, Monday to Friday. City points on Wednesday (×1) and Friday (×2). */
export const ONE_WEEK_SCHEDULE: readonly TurnScheduleEntry[] = [
  { label: 'Monday', scoring: [] },
  { label: 'Tuesday', scoring: [] },
  { label: 'Wednesday', scoring: [{ kind: 'cityPoints', pointsPerCity: 3 }] },
  { label: 'Thursday', scoring: [] },
  { label: 'Friday', scoring: [{ kind: 'cityPoints', pointsPerCity: 6 }] },
];

/** v0: one-week Points mode on the 4-player map. */
export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  map: V0_FOUR_PLAYER_MAP,
  startingUnits: DEFAULT_STARTING_UNITS,
  economy: DEFAULT_ECONOMY_RULES,
  combat: DEFAULT_COMBAT_RULES,
  orders: DEFAULT_ORDER_RULES,
  schedule: ONE_WEEK_SCHEDULE,
};
