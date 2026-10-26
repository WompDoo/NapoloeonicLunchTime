import type {
  BattleRole,
  BattleSide,
  CombatProfile,
  StrengthBonus,
} from '../lib/combat/battle';
import type { PlayerId } from '../lib/core/ids';
import { createUnitCounts } from '../lib/core/unit-counts';
import type { UnitCounts } from '../lib/core/unit-types';
import { TEST_COMBAT_RULES } from './test-config';

export const TEST_PROFILE: CombatProfile = {
  baseStrength: TEST_COMBAT_RULES.baseStrength,
  offense: TEST_COMBAT_RULES.offense,
  vulnerability: TEST_COMBAT_RULES.vulnerability,
  winnerLossRatio: TEST_COMBAT_RULES.winnerLossRatio,
};

const DEFENDER_BONUSES: readonly StrengthBonus[] = [
  { source: 'defender', value: TEST_COMBAT_RULES.defenderBonus },
];

const ROLE_BONUSES: Readonly<Record<BattleRole, readonly StrengthBonus[]>> = {
  defender: DEFENDER_BONUSES,
  attacker: [],
};

export function battleSide(
  playerId: PlayerId,
  role: BattleRole,
  counts: Partial<UnitCounts>,
  profile: Partial<CombatProfile> = {},
): BattleSide {
  return {
    playerId,
    role,
    units: createUnitCounts(counts),
    profile: { ...TEST_PROFILE, ...profile },
    bonuses: ROLE_BONUSES[role],
  };
}
