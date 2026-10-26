import { createUnitCounts } from '@lunch-campaign/engine';
import {
  armyIn,
  createV0State,
  eventsOfType,
  firstEvent,
  move,
  P1,
  P2,
  play,
} from '../../testing/v0-scenario';
import { BAYONET_DRILL, LANCERS, ORDERLY_RETREAT } from './upgrades';

describe('upgrades', () => {
  describe('Orderly Retreat', () => {
    // p2's 12 skirmishers (16.8) crush p1's mixed army in B2 (8.75).
    const zones = {
      B2: { owner: P1, units: { line: 2, cavalry: 2, skirmishers: 1 } },
      A2: { owner: P1 },
      B3: { owner: P2, units: { skirmishers: 12 } },
    };
    const attack = {
      playerId: P2,
      orders: [move('B3', 'B2', { skirmishers: 12 })],
    };

    it('saves one unit of each combat type when bought, active the same night', () => {
      const { state, replayLog } = play(createV0State({ zones }), [
        {
          playerId: P1,
          orders: [{ kind: 'buyUpgrade', upgradeId: ORDERLY_RETREAT }],
        },
        attack,
      ]);
      expect(armyIn(state, 'A2', P1)).toEqual(
        createUnitCounts({ line: 1, cavalry: 1, skirmishers: 1 }),
      );
      expect(eventsOfType(replayLog, 'Retreated')).toHaveLength(1);
    });

    it('is what saves them', () => {
      const { state } = play(createV0State({ zones }), [attack]);
      expect(armyIn(state, 'A2', P1)).toEqual(createUnitCounts({}));
    });
  });

  it('Bayonet Drill: line takes normal, not doubled, damage from skirmishers', () => {
    const zones = {
      B2: { owner: P1, units: { line: 4 } },
      B3: { owner: P2, units: { skirmishers: 3 } },
    };
    const attack = [
      { playerId: P2, orders: [move('B3', 'B2', { skirmishers: 3 })] },
    ];
    // Without: skirmishers 3 × 2 = 6 beat line 4 × 1.25 = 5. With: 3 × 2 × 0.5 = 3 lose.
    const without = play(createV0State({ zones }), attack);
    const drilled = play(
      createV0State({ zones, players: [{ upgrades: [BAYONET_DRILL] }] }),
      attack,
    );
    expect(
      firstEvent(without.replayLog, 'BattleResolved').battle.outcome,
    ).toEqual({ kind: 'victory', winnerId: P2 });
    expect(
      firstEvent(drilled.replayLog, 'BattleResolved').battle.outcome,
    ).toEqual({ kind: 'victory', winnerId: P1 });
  });

  it('Lancers: cavalry takes normal, not doubled, damage from line infantry', () => {
    const zones = {
      B2: { owner: P1, units: { cavalry: 5 } },
      B3: { owner: P2, units: { line: 3 } },
    };
    const attack = [
      { playerId: P1, orders: [move('B2', 'B3', { cavalry: 5 })] },
    ];
    // Without: line 3 × 2 × 1.25 = 7.5 beats cavalry 5. With: 3 × 2 × 0.5 × 1.25 = 3.75 loses.
    const without = play(createV0State({ zones }), attack);
    const withLancers = play(
      createV0State({ zones, players: [{ upgrades: [LANCERS] }] }),
      attack,
    );
    expect(
      firstEvent(without.replayLog, 'BattleResolved').battle.outcome,
    ).toEqual({ kind: 'victory', winnerId: P2 });
    expect(
      firstEvent(withLancers.replayLog, 'BattleResolved').battle.outcome,
    ).toEqual({ kind: 'victory', winnerId: P1 });
  });
});
