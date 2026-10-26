import {
  createUnitCounts,
  EngineContractError,
  requirePresent,
} from '@lunch-campaign/engine';
import {
  bombardment,
  decided,
  field,
  formed,
  P1,
  P2,
  P3,
  record,
  resolved,
  retreated,
} from '../testing/log-builder';
import type { BattleRecord } from './battle-records';
import { battleRecords, isWonBy, sideOf } from './battle-records';

function onlyBattle(battles: readonly BattleRecord[]): BattleRecord {
  expect(battles).toHaveLength(1);
  return requirePresent(battles[0], 'battle');
}

describe('battleRecords', () => {
  it('joins a zone battle from its formation, bombardment, combat and retreats', () => {
    const [battle] = battleRecords(
      record([
        formed(2, 'B2', [
          { playerId: P1, role: 'defender', units: { line: 3, cavalry: 2 } },
          { playerId: P2, units: { skirmishers: 6 } },
        ]),
        bombardment(2, P2, 'B2', [P1, P1]),
        bombardment(2, P1, 'C3', [P2]),
        resolved(
          2,
          'B2',
          [
            { playerId: P1, role: 'defender', units: { line: 1, cavalry: 2 } },
            {
              playerId: P2,
              units: { skirmishers: 6 },
              remaining: { skirmishers: 4 },
            },
          ],
          P2,
        ),
        retreated(2, P1, 'B2', { line: 1, cavalry: 1 }),
        retreated(3, P1, 'B2', { line: 9 }),
      ]),
    );
    expect(battle).toEqual({
      turnNumber: 2,
      winnerId: P2,
      sides: [
        {
          playerId: P1,
          role: 'defender',
          unitsAtStart: createUnitCounts({ line: 3, cavalry: 2 }),
          unitsLost: 3,
          unitsLostInCombat: 1,
        },
        {
          playerId: P2,
          role: 'attacker',
          unitsAtStart: createUnitCounts({ skirmishers: 6 }),
          unitsLost: 2,
          unitsLostInCombat: 2,
        },
      ],
    });
  });

  it('takes the outcome of a battle decided by bombardment', () => {
    const battles = battleRecords(
      record([
        formed(1, 'A2', [
          { playerId: P1, units: { line: 1 } },
          { playerId: P2, units: { artillery: 1 } },
        ]),
        bombardment(1, P1, 'A2', [P2]),
        decided(1, 'A2', P1),
      ]),
    );
    expect(onlyBattle(battles).winnerId).toBe(P1);
    expect(onlyBattle(battles).sides.map((side) => side.unitsLost)).toEqual([
      0, 1,
    ]);
  });

  it('records head-on clashes as battles', () => {
    const battle = onlyBattle(
      battleRecords(
        record([
          field(
            4,
            [
              { playerId: P1, units: { line: 3 }, remaining: { line: 2 } },
              { playerId: P3, units: { cavalry: 2 } },
            ],
            P1,
          ),
        ]),
      ),
    );
    expect(battle.sides.map((side) => [side.playerId, side.unitsLost])).toEqual(
      [
        [P1, 1],
        [P3, 2],
      ],
    );
    expect(isWonBy(battle, P1)).toBe(true);
    expect(sideOf(battle, P2)).toBeUndefined();
  });

  it('gives a mutual destruction no winner', () => {
    const battles = battleRecords(
      record([
        formed(1, 'B2', [
          { playerId: P1, units: { line: 2 } },
          { playerId: P2, units: { line: 2 } },
        ]),
        resolved(
          1,
          'B2',
          [
            { playerId: P1, units: { line: 2 } },
            { playerId: P2, units: { line: 2 } },
          ],
          null,
        ),
      ]),
    );
    expect(onlyBattle(battles).winnerId).toBeNull();
  });

  it('refuses a log that forms a battle but never ends it', () => {
    expect(() =>
      battleRecords(
        record([formed(1, 'B2', [{ playerId: P1, units: { line: 1 } }])]),
      ),
    ).toThrow(EngineContractError);
  });
});
