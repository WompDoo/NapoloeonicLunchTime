import type { PlayerId } from '../core/ids';
import type { UnitCounts } from '../core/unit-types';
import type {
  BattleRole,
  BattleSide,
  CombatProfile,
  StrengthBonus,
} from '../combat/battle';
import type { CombatRules } from '../config/match-config';

const ROLE_BONUSES: Readonly<
  Record<BattleRole, (combat: CombatRules) => readonly StrengthBonus[]>
> = {
  defender: (combat): readonly StrengthBonus[] => [
    { source: 'defender', value: combat.defenderBonus },
  ],
  attacker: (): readonly StrengthBonus[] => [],
};

export function createBattleSide(
  playerId: PlayerId,
  units: UnitCounts,
  role: BattleRole,
  combat: CombatRules,
): BattleSide {
  return {
    playerId,
    role,
    units,
    profile: combatProfileFromRules(combat),
    bonuses: ROLE_BONUSES[role](combat),
  };
}

function combatProfileFromRules(combat: CombatRules): CombatProfile {
  return {
    baseStrength: combat.baseStrength,
    offense: combat.offense,
    vulnerability: combat.vulnerability,
    winnerLossRatio: combat.winnerLossRatio,
  };
}
