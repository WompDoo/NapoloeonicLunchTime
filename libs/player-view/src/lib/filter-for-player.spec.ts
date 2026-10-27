import {
  DEFAULT_MATCH_CONFIG,
  FOG,
  MUD,
  MURAT,
  TYPHUS,
} from '@lunch-campaign/content';
import type { ScenarioOptions } from '@lunch-campaign/content/testing';
import { createV0State, P1, P2 } from '@lunch-campaign/content/testing';
import type { MatchState, PlayerId, ReplayEvent } from '@lunch-campaign/engine';
import {
  createEventModifier,
  createUnitCounts,
  requirePresent,
  toZoneId,
} from '@lunch-campaign/engine';
import { scoreMatch } from '@lunch-campaign/honours';
import {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  playSpiedWeek,
  spiedWeekView,
} from '../testing/spied-week';
import { filterForPlayer } from './filter-for-player';
import type { MatchLogs, PlayerView, ZoneView } from './player-view';
import { visibleEventsFor } from './visible-events';

const NO_LOGS: MatchLogs = { replayLog: [], spyLog: [] };

const BOARD: ScenarioOptions['zones'] = {
  A1: { owner: P1, units: { line: 2, cavalry: 1 } },
  B2: { owner: P2, units: { line: 3, skirmishers: 2 } },
};

function stateWith(options: ScenarioOptions): MatchState {
  return createV0State({ zones: BOARD, ...options });
}

function viewOf(state: MatchState, logs: MatchLogs = NO_LOGS): PlayerView {
  return filterForPlayer(state, logs, P1, DEFAULT_MATCH_CONFIG);
}

function zone(view: PlayerView, zoneId: string): ZoneView {
  return requirePresent(
    view.zones.find((candidate) => candidate.zoneId === zoneId),
    `zone ${zoneId} in the view`,
  );
}

describe('filterForPlayer', () => {
  describe('on an ordinary day', () => {
    const view = viewOf(stateWith({ players: [{ supply: 11 }] }));

    it('shows your own zones in full and everyone else’s as a count', () => {
      expect(zone(view, 'A1')).toEqual({
        zoneId: 'A1',
        kind: 'capital',
        position: { row: 1, column: 1 },
        ownerId: P1,
        army: {
          kind: 'composition',
          units: createUnitCounts({ line: 2, cavalry: 1 }),
        },
      });
      expect(zone(view, 'B2')).toEqual({
        zoneId: 'B2',
        kind: 'city',
        position: { row: 2, column: 2 },
        ownerId: P2,
        army: { kind: 'count', count: 5 },
      });
      expect(zone(view, 'C2').army).toEqual({ kind: 'count', count: 0 });
    });

    it('lists every zone in zone id order', () => {
      expect(view.zones.map((zoneView) => zoneView.zoneId)).toEqual(
        DEFAULT_MATCH_CONFIG.map.zones.map((definition) => definition.id),
      );
    });

    it('shows your supply, and only yours', () => {
      expect(view.me).toEqual({
        playerId: P1,
        seat: 1,
        commanderId: 'moore',
        score: 0,
        upgrades: [],
        abilityUsed: false,
        eliminated: false,
        supply: 11,
      });
      view.players.forEach((player) => {
        expect(player).not.toHaveProperty('supply');
      });
      expect(view.players.map((player) => player.seat)).toEqual([1, 2, 3, 4]);
    });

    it('describes the day', () => {
      expect(view).toMatchObject({
        viewerId: P1,
        turnNumber: 1,
        dayLabel: 'Monday',
        activeEventIds: [],
        spiesAvailable: true,
        spyCost: 2,
        unitCountsVisible: true,
        honours: [],
        lastNight: [],
        spyReports: [],
        finalScore: null,
      });
    });
  });

  describe('order rules', () => {
    it('gives the day’s costs, limits and upgrades from the config', () => {
      expect(viewOf(stateWith({})).orderRules).toEqual({
        maxMoveOrders: DEFAULT_MATCH_CONFIG.orders.maxMoveOrdersPerTurn,
        moveRange: DEFAULT_MATCH_CONFIG.movement.moveRange,
        recruitCost: DEFAULT_MATCH_CONFIG.economy.recruitCost,
        upgradeCost: DEFAULT_MATCH_CONFIG.economy.upgradeCost,
        upgradeIds: DEFAULT_MATCH_CONFIG.upgrades.map((upgrade) => upgrade.id),
        abilityTargetKind: 'none',
      });
    });

    it('applies the viewer’s commander and today’s event', () => {
      const muddyMurat = stateWith({
        turnNumber: 3,
        players: [{ commanderId: MURAT }],
        extraModifiers: [createEventModifier(MUD, 3)],
      });
      expect(viewOf(muddyMurat).orderRules.moveRange).toMatchObject({
        cavalry: 2,
        artillery: 0,
      });
    });
  });

  describe('in Fog', () => {
    const foggyDay = stateWith({
      turnNumber: 3,
      extraModifiers: [createEventModifier(FOG, 3)],
    });

    it('hides other players’ counts and spies for the day', () => {
      const view = viewOf(foggyDay);
      expect(zone(view, 'B2').army).toEqual({ kind: 'hidden' });
      expect(zone(view, 'C2').army).toEqual({ kind: 'hidden' });
      expect(zone(view, 'A1').army.kind).toBe('composition');
      expect(view).toMatchObject({
        dayLabel: 'Wednesday',
        activeEventIds: [FOG],
        spiesAvailable: false,
        unitCountsVisible: false,
      });
    });

    it('shows the foggy night’s replay with counts the next day', () => {
      const foggyNight: ReplayEvent = {
        type: 'ArmyMoved',
        turnNumber: 3,
        playerId: P2,
        fromZoneId: toZoneId('B2'),
        viaZoneIds: [],
        toZoneId: toZoneId('B1'),
        units: createUnitCounts({ line: 3 }),
      };
      const view = viewOf(
        { ...foggyDay, turnNumber: 4 },
        { replayLog: [foggyNight], spyLog: [] },
      );
      expect(view.unitCountsVisible).toBe(true);
      expect(zone(view, 'B2').army).toEqual({ kind: 'count', count: 5 });
      expect(view.lastNight).toEqual([
        {
          visibility: 'counted',
          event: {
            type: 'ArmyMoved',
            turnNumber: 3,
            playerId: P2,
            zoneIds: ['B2', 'B1'],
            count: 3,
          },
        },
      ]);
    });
  });

  describe('during the scripted week', () => {
    const week = playSpiedWeek();

    it('replays only the latest night, filtered for the viewer', () => {
      const tuesday = requirePresent(week[1], 'Tuesday');
      const view = spiedWeekView(1, NAPOLEON_PLAYER);
      expect(view.lastNight).toEqual(
        visibleEventsFor(
          tuesday.logs.replayLog,
          NAPOLEON_PLAYER,
          tuesday.logs.replayLog,
        ),
      );
      expect(view.lastNight.length).toBeGreaterThan(0);
    });

    it('shows the viewer’s spy reports from today only', () => {
      const view = spiedWeekView(2, KUTUZOV_PLAYER);
      expect(view.spyReports).toEqual([
        {
          playerId: KUTUZOV_PLAYER,
          turnNumber: 3,
          zoneId: 'C3',
          ownerId: MURAT_PLAYER,
          units: createUnitCounts({ cavalry: 2 }),
          unidentified: 0,
        },
      ]);
    });

    it('shows the event in play', () => {
      expect(spiedWeekView(2, MURAT_PLAYER).activeEventIds).toEqual([TYPHUS]);
      expect(spiedWeekView(3, MURAT_PLAYER).activeEventIds).toEqual([]);
    });

    it('closes spies after Friday', () => {
      expect(spiedWeekView(5, MURAT_PLAYER).spiesAvailable).toBe(false);
    });

    it('closes spies to an eliminated player only', () => {
      const tuesday = requirePresent(week[1], 'Tuesday');
      const state: MatchState = {
        ...tuesday.state,
        players: tuesday.state.players.map((player) =>
          player.playerId === KUTUZOV_PLAYER
            ? { ...player, eliminated: true }
            : player,
        ),
      };
      const spiesFor = (viewer: PlayerId): boolean =>
        filterForPlayer(state, tuesday.logs, viewer, DEFAULT_MATCH_CONFIG)
          .spiesAvailable;
      expect(spiesFor(KUTUZOV_PLAYER)).toBe(false);
      expect(spiesFor(MURAT_PLAYER)).toBe(true);
    });

    it('ends with no day and the final score', () => {
      const finished = requirePresent(week[5], 'after Friday');
      const view = spiedWeekView(5, MURAT_PLAYER);
      expect(view.dayLabel).toBeNull();
      expect(view.finalScore).toEqual(
        scoreMatch(
          finished.logs,
          finished.state.honourIds,
          DEFAULT_MATCH_CONFIG,
        ),
      );
      expect(view.finalScore).toMatchObject({ winnerIds: [MURAT_PLAYER] });
    });
  });
});
