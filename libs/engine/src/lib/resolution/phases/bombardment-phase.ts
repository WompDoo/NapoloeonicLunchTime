import type { PlayerId, ZoneId } from '../../core/ids';
import { totalUnitCount } from '../../core/unit-counts';
import { selectCasualtyType } from '../../combat/casualties';
import { effectiveParameters } from '../../modifiers/effective-parameters';
import type { SupportOrder } from '../../orders/orders';
import type {
  BattleDecidedByBombardmentEvent,
  BattleFormedEvent,
  BattleFormedSide,
  BombardmentEvent,
  BombardmentHit,
} from '../../replay/replay-events';
import type { Army, MatchState, ZoneState } from '../../state/match-state';
import {
  findZone,
  setPlayerUnitsInZone,
} from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

const ARMIES_NEEDED_FOR_BATTLE = 2;

interface PlacedSupport {
  readonly playerId: PlayerId;
  readonly order: SupportOrder;
}

interface BattleAtPhaseStart {
  readonly zoneId: ZoneId;
  /** Fixed at the start of the phase: a defender destroyed by bombardment stays the defender. */
  readonly defenderId: PlayerId | null;
  readonly participantIds: readonly PlayerId[];
}

interface Volley {
  readonly state: MatchState;
  readonly hits: readonly BombardmentHit[];
  readonly blockedHits: number;
  readonly wastedHits: number;
}

/**
 * Supporting artillery fires into battles its owner takes part in, before combat. Everything present at the
 * start of the phase fires; players fire in seat order. Each hit removes one unit in removal order:
 * an attacker's guns hit the defender (hits on a destroyed defender are wasted); a defender's guns, or any
 * guns in a battle with no defender, hit whichever enemy army is largest at that moment (tie: lowest seat).
 */
export function applyBombardmentPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const battleZones = resolution.match.zones.filter(
    (zone): boolean => zone.armies.length >= ARMIES_NEEDED_FOR_BATTLE,
  );
  const battles = battleZones.map(describeBattleAtPhaseStart);
  const formed = appendEvents(
    resolution,
    resolution.match,
    battleZones.map(
      (zone): BattleFormedEvent =>
        toBattleFormedEvent(zone, context.turnNumber),
    ),
  );
  const afterFiring = context.acceptedOrders
    .flatMap((accepted): readonly PlacedSupport[] =>
      accepted.supports.map(
        (order): PlacedSupport => ({ playerId: accepted.playerId, order }),
      ),
    )
    .flatMap((support): readonly [PlacedSupport, BattleAtPhaseStart][] =>
      battles
        .filter((battle): boolean => isSupportFor(support, battle))
        .map((battle): [PlacedSupport, BattleAtPhaseStart] => [
          support,
          battle,
        ]),
    )
    .reduce(
      (current, [support, battle]): ResolutionState =>
        fireSupport(current, support, battle, context),
      formed,
    );
  return appendEvents(
    afterFiring,
    afterFiring.match,
    battles
      .map((battle): ZoneState => findZone(afterFiring.match, battle.zoneId))
      .filter((zone): boolean => zone.armies.length < ARMIES_NEEDED_FOR_BATTLE)
      .map(
        (zone): BattleDecidedByBombardmentEvent => ({
          type: 'BattleDecidedByBombardment',
          turnNumber: context.turnNumber,
          zoneId: zone.zoneId,
          survivorId: soleSurvivor(zone),
        }),
      ),
  );
}

function toBattleFormedEvent(
  zone: ZoneState,
  turnNumber: number,
): BattleFormedEvent {
  return {
    type: 'BattleFormed',
    turnNumber,
    zoneId: zone.zoneId,
    sides: zone.armies.map(
      (army): BattleFormedSide => ({
        playerId: army.playerId,
        role: army.playerId === zone.ownerId ? 'defender' : 'attacker',
        units: army.units,
      }),
    ),
  };
}

function soleSurvivor(zone: ZoneState): PlayerId | null {
  return zone.armies.map((army): PlayerId => army.playerId)[0] ?? null;
}

function describeBattleAtPhaseStart(zone: ZoneState): BattleAtPhaseStart {
  const participantIds = zone.armies.map((army): PlayerId => army.playerId);
  return {
    zoneId: zone.zoneId,
    defenderId:
      participantIds.find((playerId): boolean => playerId === zone.ownerId) ??
      null,
    participantIds,
  };
}

function isSupportFor(
  support: PlacedSupport,
  battle: BattleAtPhaseStart,
): boolean {
  return (
    support.order.targetZoneId === battle.zoneId &&
    battle.participantIds.includes(support.playerId)
  );
}

function fireSupport(
  resolution: ResolutionState,
  support: PlacedSupport,
  battle: BattleAtPhaseStart,
  context: TurnContext,
): ResolutionState {
  const parameters = effectiveParameters(
    resolution.match,
    context.config,
    support.playerId,
    battle.zoneId,
  );
  const hitCount =
    support.order.count *
    parameters.bombardmentHitsPerArtillery *
    parameters.bombardmentVolleys;
  const volley = Array.from({ length: hitCount }).reduce<Volley>(
    (current): Volley => fireOneHit(current, support.playerId, battle, context),
    { state: resolution.match, hits: [], blockedHits: 0, wastedHits: 0 },
  );
  const event: BombardmentEvent = {
    type: 'Bombardment',
    turnNumber: context.turnNumber,
    playerId: support.playerId,
    fromZoneId: support.order.fromZoneId,
    targetZoneId: battle.zoneId,
    artillery: support.order.count,
    hits: volley.hits,
    blockedHits: volley.blockedHits,
    wastedHits: volley.wastedHits,
  };
  return appendEvents(resolution, volley.state, [event]);
}

function fireOneHit(
  volley: Volley,
  supporterId: PlayerId,
  battle: BattleAtPhaseStart,
  context: TurnContext,
): Volley {
  const target = chooseTarget(
    findZone(volley.state, battle.zoneId),
    supporterId,
    battle.defenderId,
  );
  return target === undefined
    ? { ...volley, wastedHits: volley.wastedHits + 1 }
    : hitOrBlock(volley, target, battle, context);
}

function hitOrBlock(
  volley: Volley,
  target: Army,
  battle: BattleAtPhaseStart,
  context: TurnContext,
): Volley {
  const shielded = effectiveParameters(
    volley.state,
    context.config,
    target.playerId,
    battle.zoneId,
  ).shieldedFromEnemyBombardment;
  return shielded
    ? { ...volley, blockedHits: volley.blockedHits + 1 }
    : landHit(volley, target, battle, context);
}

function landHit(
  volley: Volley,
  target: Army,
  battle: BattleAtPhaseStart,
  context: TurnContext,
): Volley {
  const unitType = selectCasualtyType(
    target.units,
    context.config.combat.casualtyRemovalOrder,
  );
  return {
    ...volley,
    state: setPlayerUnitsInZone(volley.state, battle.zoneId, target.playerId, {
      ...target.units,
      [unitType]: target.units[unitType] - 1,
    }),
    hits: [...volley.hits, { playerId: target.playerId, unitType }],
  };
}

function chooseTarget(
  zone: ZoneState,
  supporterId: PlayerId,
  defenderId: PlayerId | null,
): Army | undefined {
  return largestArmy(targetCandidates(zone, supporterId, defenderId));
}

function targetCandidates(
  zone: ZoneState,
  supporterId: PlayerId,
  defenderId: PlayerId | null,
): readonly Army[] {
  return isAttackingADefender(supporterId, defenderId)
    ? zone.armies.filter((army): boolean => army.playerId === defenderId)
    : zone.armies.filter((army): boolean => army.playerId !== supporterId);
}

function isAttackingADefender(
  supporterId: PlayerId,
  defenderId: PlayerId | null,
): boolean {
  return defenderId !== null && defenderId !== supporterId;
}

/** Armies are kept in seat order, so the first of equally large armies has the lowest seat. */
function largestArmy(armies: readonly Army[]): Army | undefined {
  return armies.length === 0
    ? undefined
    : armies.reduce(
        (largest, army): Army =>
          totalUnitCount(army.units) > totalUnitCount(largest.units)
            ? army
            : largest,
      );
}
