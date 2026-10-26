import type {
  BattleResolvedEvent,
  MatchState,
  Order,
  PlayerId,
  PlayerOrders,
  PlayerState,
} from '@lunch-campaign/engine';
import {
  createUnitCounts,
  effectiveParameters,
  requirePresent,
} from '@lunch-campaign/engine';
import { DEFAULT_MATCH_CONFIG } from '../config/default-match-config';
import {
  armyIn,
  createV0State,
  eventsOfType,
  firstEvent,
  move,
  ownedZone,
  ownerOf,
  P1,
  P2,
  play,
  reinforcement,
  support,
} from '../../testing/v0-scenario';
import type { ScenarioZone } from '../../testing/v0-scenario';
import {
  BLUCHER,
  KUTUZOV,
  MURAT,
  NAPOLEON,
  SIR_JOHN_MOORE,
  WELLINGTON,
} from './commanders';

const USE_ABILITY_WITHOUT_TARGET: Order = {
  kind: 'useAbility',
  target: { kind: 'none' },
};

function stateWith(
  commanderId: string,
  zones: Readonly<Record<string, ScenarioZone>>,
): MatchState {
  const firstPlayer: Partial<PlayerState> = { commanderId };
  return createV0State({ zones, players: [firstPlayer] });
}

function firstBattle(
  replayLog: Parameters<typeof eventsOfType>[0],
): BattleResolvedEvent {
  return requirePresent(eventsOfType(replayLog, 'BattleResolved')[0], 'battle');
}

function strengthOf(battle: BattleResolvedEvent, playerId: PlayerId): number {
  return requirePresent(
    battle.battle.sides.find((side) => side.playerId === playerId),
    'side',
  ).strength.totalStrength;
}

describe('commanders', () => {
  describe('Napoleon', () => {
    // p1 attacks p2's B2 from B1 and supports from A2 with 1 artillery.
    const zones = {
      A2: { owner: P1, units: { artillery: 1 } },
      B1: { owner: P1, units: { line: 4 } },
      B2: { owner: P2, units: { line: 5 } },
    };
    const orders = (extra: readonly Order[]): readonly PlayerOrders[] => [
      {
        playerId: P1,
        orders: [
          move('B1', 'B2', { line: 4 }),
          support('A2', 'B2', 1),
          ...extra,
        ],
      },
    ];

    it('passive: artillery bombards +1 unit', () => {
      const plain = play(stateWith(SIR_JOHN_MOORE, zones), orders([]));
      const napoleon = play(stateWith(NAPOLEON, zones), orders([]));
      expect(firstEvent(plain.replayLog, 'Bombardment').hits).toHaveLength(1);
      expect(firstEvent(napoleon.replayLog, 'Bombardment').hits).toHaveLength(
        2,
      );
    });

    it('Grand Battery: all artillery bombards twice tonight', () => {
      const { replayLog } = play(
        stateWith(NAPOLEON, zones),
        orders([USE_ABILITY_WITHOUT_TARGET]),
      );
      expect(firstEvent(replayLog, 'Bombardment').hits).toHaveLength(4);
      expect(firstEvent(replayLog, 'AbilityUsed').abilityId).toBe(
        'grand-battery',
      );
    });
  });

  describe('Wellington', () => {
    it('passive: defender bonus +10%', () => {
      const zones = {
        B2: { owner: P1, units: { line: 4 } },
        B3: { owner: P2, units: { line: 3 } },
      };
      const attack = [
        { playerId: P2, orders: [move('B3', 'B2', { line: 3 })] },
      ];
      expect(
        strengthOf(
          firstBattle(play(stateWith(SIR_JOHN_MOORE, zones), attack).replayLog),
          P1,
        ),
      ).toBe(5);
      expect(
        strengthOf(
          firstBattle(play(stateWith(WELLINGTON, zones), attack).replayLog),
          P1,
        ),
      ).toBeCloseTo(5.4, 9);
    });

    it('Reverse Slope: no enemy bombardment, and the base defender bonus doubles (60% in all)', () => {
      const zones = {
        B2: { owner: P1, units: { line: 4 } },
        B3: { owner: P2, units: { line: 6 } },
        C2: { owner: P2, units: { artillery: 2 } },
      };
      const attack = {
        playerId: P2,
        orders: [move('B3', 'B2', { line: 6 }), support('C2', 'B2', 2)],
      };
      const exposed = play(stateWith(WELLINGTON, zones), [attack]);
      expect(firstBattle(exposed.replayLog).battle.outcome).toEqual({
        kind: 'victory',
        winnerId: P2,
      });
      const sheltered = play(stateWith(WELLINGTON, zones), [
        {
          playerId: P1,
          orders: [{ kind: 'useAbility', target: ownedZone('B2') }],
        },
        attack,
      ]);
      expect(eventsOfType(sheltered.replayLog, 'Bombardment')[0]).toMatchObject(
        { hits: [], blockedHits: 2 },
      );
      expect(strengthOf(firstBattle(sheltered.replayLog), P1)).toBeCloseTo(
        4 * 1.6,
        9,
      );
      expect(firstBattle(sheltered.replayLog).battle.outcome).toEqual({
        kind: 'victory',
        winnerId: P1,
      });
    });
  });

  describe('Murat', () => {
    it('passive: cavalry moves 2 zones through owned or empty zones', () => {
      const zones = { A1: { owner: P1, units: { cavalry: 2 } } };
      const charge = [
        { playerId: P1, orders: [move('A1', 'B2', { cavalry: 2 }, ['A2'])] },
      ];
      expect(
        firstEvent(
          play(stateWith(SIR_JOHN_MOORE, zones), charge).replayLog,
          'OrderRejected',
        ).reason,
      ).toBe('beyondMoveRange');
      expect(ownerOf(play(stateWith(MURAT, zones), charge).state, 'B2')).toBe(
        P1,
      );
    });

    it('Grand Charge: no defender bonus where Murat attacks with cavalry', () => {
      // Cavalry 3 × 2 = 6 against skirmishers 5: 6.25 with the defender bonus, 5 without.
      const zones = {
        B2: { owner: P1, units: { cavalry: 3 } },
        B3: { owner: P2, units: { skirmishers: 5 } },
      };
      const attack = (extra: readonly Order[]): readonly PlayerOrders[] => [
        { playerId: P1, orders: [move('B2', 'B3', { cavalry: 3 }), ...extra] },
      ];
      expect(
        firstBattle(play(stateWith(MURAT, zones), attack([])).replayLog).battle
          .outcome,
      ).toEqual({ kind: 'victory', winnerId: P2 });
      expect(
        firstBattle(
          play(stateWith(MURAT, zones), attack([USE_ABILITY_WITHOUT_TARGET]))
            .replayLog,
        ).battle.outcome,
      ).toEqual({ kind: 'victory', winnerId: P1 });
    });
  });

  describe('Blücher', () => {
    it('passive: attacking armies +10%, head-on clashes included', () => {
      const zones = {
        A2: { owner: P1, units: { line: 3 } },
        B2: { owner: P2, units: { line: 3 } },
      };
      const clash = [
        { playerId: P1, orders: [move('A2', 'B2', { line: 3 })] },
        { playerId: P2, orders: [move('B2', 'A2', { line: 3 })] },
      ];
      expect(
        firstEvent(
          play(stateWith(SIR_JOHN_MOORE, zones), clash).replayLog,
          'FieldBattle',
        ).battle.outcome,
      ).toEqual({
        kind: 'mutualDestruction',
      });
      expect(
        firstEvent(
          play(stateWith(BLUCHER, zones), clash).replayLog,
          'FieldBattle',
        ).battle.outcome,
      ).toEqual({
        kind: 'victory',
        winnerId: P1,
      });
    });

    it('Marschall Vorwärts: part of an army that held joins an adjacent battle', () => {
      const zones = {
        A2: { owner: P1, units: { line: 3 } },
        B1: { owner: P1, units: { line: 3 } },
        B2: { owner: P2, units: { line: 4 } },
      };
      const { state, replayLog } = play(stateWith(BLUCHER, zones), [
        {
          playerId: P1,
          orders: [
            move('B1', 'B2', { line: 3 }),
            {
              kind: 'useAbility',
              target: reinforcement('A2', 'B2', { line: 2 }),
            },
          ],
        },
      ]);
      expect(eventsOfType(replayLog, 'ReinforcementsJoined')).toHaveLength(1);
      // 5 line × 1.1 = 5.5 beats 4 × 1.25 = 5.
      expect(firstBattle(replayLog).battle.outcome).toEqual({
        kind: 'victory',
        winnerId: P1,
      });
      expect(armyIn(state, 'A2', P1)).toEqual(createUnitCounts({ line: 1 }));
    });
  });

  describe('Kutuzov', () => {
    it('passive: Orderly Retreat without buying it', () => {
      const zones = {
        B2: { owner: P1, units: { line: 2, cavalry: 1 } },
        A2: { owner: P1 },
        B3: { owner: P2, units: { skirmishers: 12 } },
      };
      const { state } = play(stateWith(KUTUZOV, zones), [
        { playerId: P2, orders: [move('B3', 'B2', { skirmishers: 12 })] },
      ]);
      expect(armyIn(state, 'A2', P1)).toEqual(
        createUnitCounts({ line: 1, cavalry: 1 }),
      );
    });

    it('Scorched Earth: a zone produces nothing, for whoever holds it, tonight and tomorrow', () => {
      const monday = stateWith(KUTUZOV, {
        A1: { owner: P1 },
        A2: { owner: P1 },
        B2: { owner: P2, units: { line: 1 } },
      });
      const mondayNight = play(monday, [
        {
          playerId: P1,
          orders: [{ kind: 'useAbility', target: ownedZone('A2') }],
        },
      ]);
      const tuesdayNight = play(mondayNight.state, [
        { playerId: P2, orders: [move('B2', 'A2', { line: 1 })] },
      ]);
      const wednesdayNight = play(tuesdayNight.state, []);
      const produced = (
        night: typeof mondayNight,
        playerId: PlayerId,
      ): number | undefined =>
        eventsOfType(night.replayLog, 'SupplyProduced').find(
          (event) => event.playerId === playerId,
        )?.amount;
      expect(produced(mondayNight, P1)).toBe(3);
      expect(ownerOf(tuesdayNight.state, 'A2')).toBe(P2);
      expect(produced(tuesdayNight, P2)).toBe(2);
      expect(produced(wednesdayNight, P2)).toBe(3);
    });
  });

  describe('Sir John Moore', () => {
    it('passive: skirmishers appear as unidentified in spy reports', () => {
      const state = createV0State({
        players: [{ commanderId: SIR_JOHN_MOORE }, { commanderId: NAPOLEON }],
      });
      expect(
        effectiveParameters(state, DEFAULT_MATCH_CONFIG, P1, null)
          .spyHiddenUnitTypes,
      ).toEqual(['skirmishers']);
      expect(
        effectiveParameters(state, DEFAULT_MATCH_CONFIG, P2, null)
          .spyHiddenUnitTypes,
      ).toEqual([]);
    });

    it('Ambush: skirmishers deal double damage to cavalry and take normal damage from it', () => {
      // Without: cavalry 3 × 2 = 6 beat skirmishers 3 × 1.25 = 3.75. With: 7.5 against 3.
      const zones = {
        B2: { owner: P1, units: { skirmishers: 3 } },
        B3: { owner: P2, units: { cavalry: 3 } },
      };
      const attack = {
        playerId: P2,
        orders: [move('B3', 'B2', { cavalry: 3 })],
      };
      expect(
        firstBattle(play(stateWith(SIR_JOHN_MOORE, zones), [attack]).replayLog)
          .battle.outcome,
      ).toEqual({
        kind: 'victory',
        winnerId: P2,
      });
      const ambushed = firstBattle(
        play(stateWith(SIR_JOHN_MOORE, zones), [
          { playerId: P1, orders: [USE_ABILITY_WITHOUT_TARGET] },
          attack,
        ]).replayLog,
      );
      expect(strengthOf(ambushed, P1)).toBe(7.5);
      expect(strengthOf(ambushed, P2)).toBe(3);
    });
  });
});
