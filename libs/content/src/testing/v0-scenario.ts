import type {
  AbilityTarget,
  ActiveModifier,
  Army,
  MatchState,
  MoveOrder,
  PlayerId,
  PlayerOrders,
  PlayerState,
  ReplayEvent,
  SupportOrder,
  TurnResult,
  UnitCounts,
  ZoneId,
  ZoneState,
} from '@lunch-campaign/engine';
import {
  createCommanderPassiveModifier,
  createUnitCounts,
  createUpgradeModifier,
  findZone,
  requirePresent,
  resolveTurn,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/engine';
import { DEFAULT_MATCH_CONFIG } from '../lib/config/default-match-config';
import { SIR_JOHN_MOORE } from '../lib/modifiers/commanders';

export const P1 = toPlayerId('p1');
export const P2 = toPlayerId('p2');
export const P3 = toPlayerId('p3');
export const P4 = toPlayerId('p4');

/** Moore's passive only affects spy reports (Milestone 4), so he is the neutral default for resolution tests. */
const NEUTRAL_COMMANDER = SIR_JOHN_MOORE;

export interface ScenarioArmy {
  readonly playerId: PlayerId;
  readonly units: Partial<UnitCounts>;
}

export interface ScenarioZone {
  readonly owner?: PlayerId;
  readonly units?: Partial<UnitCounts>;
  readonly armies?: readonly ScenarioArmy[];
}

export interface ScenarioOptions {
  readonly turnNumber?: number;
  /** Overrides per seat (index 0 = seat 1). Commanders' passives and owned upgrades are put in play. */
  readonly players?: readonly Partial<PlayerState>[];
  readonly zones?: Readonly<Record<string, ScenarioZone>>;
  readonly extraModifiers?: readonly ActiveModifier[];
}

const DEFAULT_SCENARIO: Required<ScenarioOptions> = {
  turnNumber: 1,
  players: [],
  zones: {},
  extraModifiers: [],
};

interface ResolvedZone {
  readonly owner: PlayerId | null;
  readonly units: Partial<UnitCounts> | null;
  readonly armies: readonly ScenarioArmy[];
}

const EMPTY_ZONE: ResolvedZone = { owner: null, units: null, armies: [] };

/** A state on the v0 map with every zone neutral and empty unless the scenario says otherwise. */
export function createV0State(options: ScenarioOptions): MatchState {
  const scenario = { ...DEFAULT_SCENARIO, ...options };
  const players = DEFAULT_MATCH_CONFIG.map.startingCapitals.map(
    (capital, index): PlayerState => ({
      playerId: toPlayerId(`p${capital.seat}`),
      seat: capital.seat,
      startingCapitalZoneId: capital.zoneId,
      supply: DEFAULT_MATCH_CONFIG.economy.startingSupply,
      score: 0,
      commanderId: NEUTRAL_COMMANDER,
      upgrades: [],
      abilityUsed: false,
      eliminated: false,
      ...scenario.players[index],
    }),
  );
  return {
    matchSeed: 'scenario',
    turnNumber: scenario.turnNumber,
    players,
    zones: DEFAULT_MATCH_CONFIG.map.zones.map(
      (zone): ZoneState =>
        toZoneState(zone.id, { ...EMPTY_ZONE, ...scenario.zones[zone.id] }),
    ),
    modifiers: [
      ...players.map(
        (player): ActiveModifier =>
          createCommanderPassiveModifier(player.playerId, player.commanderId),
      ),
      ...players.flatMap((player): readonly ActiveModifier[] =>
        player.upgrades.map(
          (upgradeId): ActiveModifier =>
            createUpgradeModifier(player.playerId, upgradeId),
        ),
      ),
      ...scenario.extraModifiers,
    ],
  };
}

function toZoneState(zoneId: ZoneId, setup: ResolvedZone): ZoneState {
  return {
    zoneId,
    ownerId: setup.owner,
    armies: [...shorthandArmies(setup), ...setup.armies.map(toArmy)],
  };
}

function shorthandArmies(setup: ResolvedZone): readonly Army[] {
  return setup.owner === null ? [] : armiesFromCounts(setup.owner, setup.units);
}

function armiesFromCounts(
  owner: PlayerId,
  counts: Partial<UnitCounts> | null,
): readonly Army[] {
  return counts === null ? [] : [toArmy({ playerId: owner, units: counts })];
}

function toArmy(army: ScenarioArmy): Army {
  return { playerId: army.playerId, units: createUnitCounts(army.units) };
}

export function play(
  state: MatchState,
  orders: readonly PlayerOrders[],
): TurnResult {
  return resolveTurn(state, orders, DEFAULT_MATCH_CONFIG);
}

export function armyIn(
  state: MatchState,
  zone: string,
  playerId: PlayerId,
): UnitCounts {
  const army = findZone(state, toZoneId(zone)).armies.find(
    (candidate) => candidate.playerId === playerId,
  );
  return army === undefined ? createUnitCounts({}) : army.units;
}

export function ownerOf(state: MatchState, zone: string): PlayerId | null {
  return findZone(state, toZoneId(zone)).ownerId;
}

export function eventsOfType<TType extends ReplayEvent['type']>(
  replayLog: readonly ReplayEvent[],
  type: TType,
): readonly Extract<ReplayEvent, { readonly type: TType }>[] {
  return replayLog.filter(
    (event): event is Extract<ReplayEvent, { readonly type: TType }> =>
      event.type === type,
  );
}

export function move(
  from: string,
  to: string,
  counts: Partial<UnitCounts>,
  via: readonly string[] = [],
): MoveOrder {
  return {
    kind: 'move',
    fromZoneId: toZoneId(from),
    viaZoneIds: via.map(toZoneId),
    toZoneId: toZoneId(to),
    units: createUnitCounts(counts),
  };
}

export function ownedZone(zone: string): AbilityTarget {
  return { kind: 'ownedZone', zoneId: toZoneId(zone) };
}

export function reinforcement(
  from: string,
  to: string,
  counts: Partial<UnitCounts>,
): AbilityTarget {
  return {
    kind: 'reinforcement',
    fromZoneId: toZoneId(from),
    toZoneId: toZoneId(to),
    units: createUnitCounts(counts),
  };
}

export function support(
  from: string,
  target: string,
  count: number,
): SupportOrder {
  return {
    kind: 'support',
    fromZoneId: toZoneId(from),
    targetZoneId: toZoneId(target),
    count,
  };
}

export function firstEvent<TType extends ReplayEvent['type']>(
  replayLog: readonly ReplayEvent[],
  type: TType,
): Extract<ReplayEvent, { readonly type: TType }> {
  return requirePresent(eventsOfType(replayLog, type)[0], `${type} event`);
}
