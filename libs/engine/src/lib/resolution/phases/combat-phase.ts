import { hasAnyUnits } from '../../core/unit-counts';
import type {
  BattleResult,
  BattleRole,
  BattleSide,
  BattleSideResult,
} from '../../combat/battle';
import { resolveBattle } from '../../combat/resolve-battle';
import type { Army, ZoneState } from '../../state/match-state';
import { updateZone } from '../../state/match-state-queries';
import { createBattleSide } from '../battle-sides';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

const ARMIES_NEEDED_FOR_BATTLE = 2;

/** Every zone holding armies of two or more players after movement fights one battle, in zone id order. */
export function applyCombatPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  return resolution.match.zones
    .filter((zone): boolean => zone.armies.length >= ARMIES_NEEDED_FOR_BATTLE)
    .reduce(
      (current, zone): ResolutionState =>
        resolveBattleInZone(current, zone, context),
      resolution,
    );
}

function resolveBattleInZone(
  resolution: ResolutionState,
  zone: ZoneState,
  context: TurnContext,
): ResolutionState {
  const battle = resolveBattle(
    zone.armies.map(
      (army): BattleSide =>
        createBattleSide(
          army.playerId,
          army.units,
          roleInZone(zone, army),
          context.config.combat,
        ),
    ),
    context.config.combat,
  );
  return appendEvents(
    resolution,
    updateZone(
      resolution.match,
      zone.zoneId,
      (current): ZoneState => ({
        ...current,
        armies: survivingArmies(battle),
      }),
    ),
    [
      {
        type: 'BattleResolved',
        turnNumber: context.turnNumber,
        zoneId: zone.zoneId,
        battle,
      },
    ],
  );
}

/** The defender is the zone's owner, if the owner has units in the zone. */
function roleInZone(zone: ZoneState, army: Army): BattleRole {
  return army.playerId === zone.ownerId ? 'defender' : 'attacker';
}

function survivingArmies(battle: BattleResult): readonly Army[] {
  return battle.sides
    .filter((side): boolean => hasAnyUnits(side.unitsRemaining))
    .map(
      (side: BattleSideResult): Army => ({
        playerId: side.playerId,
        units: side.unitsRemaining,
      }),
    );
}
