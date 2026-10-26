import type { PlayerId } from '../core/ids';
import type { UnitCounts } from '../core/unit-types';
import type {
  BattleRole,
  BattleSide,
  CombatProfile,
  StrengthBonus,
} from '../combat/battle';
import type { MatchConfig } from '../config/match-config';
import { effectiveParameters } from '../modifiers/effective-parameters';
import type { EffectiveParameters } from '../modifiers/parameters';
import type { Army, MatchState, ZoneState } from '../state/match-state';

const BASE_DEFENDER_BONUS_SOURCE = 'defender';

interface Participant {
  readonly army: Army;
  readonly role: BattleRole;
  readonly parameters: EffectiveParameters;
}

const BONUSES_BY_ROLE: Readonly<
  Record<
    BattleRole,
    (
      parameters: EffectiveParameters,
      defendingBonusesCancelled: boolean,
    ) => readonly StrengthBonus[]
  >
> = {
  defender: (
    parameters,
    defendingBonusesCancelled,
  ): readonly StrengthBonus[] =>
    defendingBonusesCancelled ? [] : defendingBonuses(parameters),
  attacker: (parameters): readonly StrengthBonus[] =>
    bonusesForRole(parameters, 'attacker'),
};

/**
 * The sides of a battle in a zone. The zone's owner defends if it has units there. Each side fights with its
 * own effective parameters in that zone. An attacker with a defender-bonus suppressor present (Grand Charge
 * with cavalry) cancels every defending bonus.
 */
export function createZoneBattleSides(
  state: MatchState,
  config: MatchConfig,
  zone: ZoneState,
): readonly BattleSide[] {
  const participants = zone.armies.map(
    (army): Participant => ({
      army,
      role: army.playerId === zone.ownerId ? 'defender' : 'attacker',
      parameters: effectiveParameters(
        state,
        config,
        army.playerId,
        zone.zoneId,
      ),
    }),
  );
  const defendingBonusesCancelled = participants.some(cancelsDefendingBonuses);
  return participants.map(
    (participant): BattleSide =>
      toBattleSide(participant, defendingBonusesCancelled),
  );
}

/** A side in a head-on clash: always an attacker, never in a zone. */
export function createFieldBattleSide(
  state: MatchState,
  config: MatchConfig,
  playerId: PlayerId,
  units: UnitCounts,
): BattleSide {
  return toBattleSide(
    {
      army: { playerId, units },
      role: 'attacker',
      parameters: effectiveParameters(state, config, playerId, null),
    },
    false,
  );
}

function toBattleSide(
  participant: Participant,
  defendingBonusesCancelled: boolean,
): BattleSide {
  return {
    playerId: participant.army.playerId,
    role: participant.role,
    units: participant.army.units,
    profile: combatProfileOf(participant.parameters),
    bonuses: BONUSES_BY_ROLE[participant.role](
      participant.parameters,
      defendingBonusesCancelled,
    ),
  };
}

function cancelsDefendingBonuses(participant: Participant): boolean {
  return (
    participant.role === 'attacker' &&
    participant.parameters.defenderBonusSuppressorTypes.some(
      (unitType): boolean => participant.army.units[unitType] > 0,
    )
  );
}

function defendingBonuses(
  parameters: EffectiveParameters,
): readonly StrengthBonus[] {
  return [
    { source: BASE_DEFENDER_BONUS_SOURCE, value: parameters.defenderBonus },
    ...bonusesForRole(parameters, 'defender'),
  ];
}

function bonusesForRole(
  parameters: EffectiveParameters,
  role: BattleRole,
): readonly StrengthBonus[] {
  return parameters.strengthBonuses
    .filter((bonus): boolean => bonus.role === role)
    .map(
      (bonus): StrengthBonus => ({ source: bonus.source, value: bonus.value }),
    );
}

function combatProfileOf(parameters: EffectiveParameters): CombatProfile {
  return {
    baseStrength: parameters.baseStrength,
    offense: parameters.offense,
    vulnerability: parameters.vulnerability,
    winnerLossRatio: parameters.winnerLossRatio,
  };
}
