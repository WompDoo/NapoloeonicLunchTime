import type { HonourId } from '@lunch-campaign/content';
import { HONOUR_IDS } from '@lunch-campaign/content';
import type { PlayerId, ReplayEvent } from '@lunch-campaign/engine';
import {
  bombardment,
  captured,
  decided,
  field,
  formed,
  P1,
  P2,
  P3,
  record,
  resolved,
  retreated,
  standings,
  supply,
} from '../testing/log-builder';
import { createHonourContext } from './honour-context';
import { HONOUR_QUERIES } from './honour-queries';

const PLAYERS: readonly PlayerId[] = [P1, P2, P3];
const FINAL = standings(5, [
  { playerId: P1, units: 9, zonesOwned: 4, citiesHeld: 2 },
  { playerId: P2, units: 12, zonesOwned: 3, citiesHeld: 1 },
  { playerId: P3, units: 0, zonesOwned: 0, citiesHeld: 0 },
]);

/** Night 1: p1 (5) defends B2 against p2 (8) and wins with cavalry. Night 2: p2's guns win A3 outright. */
const BATTLES: readonly ReplayEvent[] = [
  formed(1, 'B2', [
    { playerId: P1, role: 'defender', units: { cavalry: 4, line: 1 } },
    { playerId: P2, units: { line: 8 } },
  ]),
  bombardment(1, P2, 'B2', [P1]),
  resolved(
    1,
    'B2',
    [
      {
        playerId: P1,
        role: 'defender',
        units: { cavalry: 3, line: 1 },
        remaining: { cavalry: 2 },
      },
      { playerId: P2, units: { line: 8 } },
    ],
    P1,
  ),
  retreated(1, P2, 'B2', { line: 1 }),
  formed(2, 'A3', [
    { playerId: P2, units: { line: 2 } },
    { playerId: P3, role: 'defender', units: { artillery: 1 } },
  ]),
  bombardment(2, P2, 'A3', [P3]),
  decided(2, 'A3', P2),
  field(
    3,
    [
      {
        playerId: P1,
        units: { cavalry: 3, line: 3 },
        remaining: { cavalry: 2 },
      },
      { playerId: P2, units: { line: 2 } },
    ],
    P1,
  ),
];

function measures(
  honourId: HonourId,
  replayLog: readonly ReplayEvent[],
  spiedBy?: readonly PlayerId[],
): readonly number[] {
  const context = createHonourContext(record([...replayLog, FINAL], spiedBy));
  return PLAYERS.map((playerId) =>
    HONOUR_QUERIES[honourId].measure(context, playerId),
  );
}

describe('honour queries', () => {
  it('covers every honour in the pool', () => {
    expect(Object.keys(HONOUR_QUERIES).toSorted()).toEqual(
      [...HONOUR_IDS].sort(),
    );
  });

  it.each<{
    honourId: HonourId;
    log: readonly ReplayEvent[];
    spiedBy?: readonly PlayerId[];
    expected: readonly number[];
    why: string;
  }>([
    {
      honourId: 'grande-armee',
      log: [],
      expected: [9, 12, 0],
      why: 'units after the last night',
    },
    {
      honourId: 'empire',
      log: [],
      expected: [4, 3, 0],
      why: 'zones owned after the last night',
    },
    {
      honourId: 'butchers-bill',
      log: BATTLES,
      // p1: 7 of p2's 8 line in B2 (1 retreated) + 2 line in the clash. p2: 1 bombardment hit in B2 + 1 in A3.
      expected: [9, 2, 0],
      why: 'combat kills credited to winners plus bombardment kills',
    },
    {
      honourId: 'iron-discipline',
      log: BATTLES,
      // p1: 1 to bombardment + 2 in B2 combat + 4 in the clash. p2: 7 in B2 + 2 in the clash. p3: 1 to bombardment.
      expected: [7, 9, 1],
      why: 'units lost in battle, net of retreats',
    },
    {
      honourId: 'the-fox',
      log: BATTLES,
      // p1 won B2 with 5 against 8. p2 won A3 with 2 against 1, and p1 won the clash 6 against 2: not outnumbered.
      expected: [1, 0, 0],
      why: 'battles won while outnumbered (before bombardment)',
    },
    {
      honourId: 'last-stand',
      log: BATTLES,
      expected: [1, 0, 0],
      why: 'battles won as defender',
    },
    {
      honourId: 'spymaster',
      log: [],
      spiedBy: [P2, P2, P3],
      expected: [0, 2, 1],
      why: 'spy reports',
    },
    {
      honourId: 'thunder-of-guns',
      log: BATTLES,
      expected: [0, 2, 0],
      why: 'units removed by your bombardment',
    },
    {
      honourId: 'saddle-up',
      log: BATTLES,
      expected: [1, 0, 0],
      why: 'battles won where cavalry was strictly largest',
    },
    {
      honourId: 'rearguard',
      log: BATTLES,
      expected: [0, 1, 0],
      why: 'units saved by Orderly Retreat',
    },
    {
      honourId: 'forager',
      log: [supply(1, P1, 3), supply(2, P1, 4), supply(1, P2, 9)],
      expected: [7, 9, 0],
      why: 'supply produced over the match',
    },
    {
      honourId: 'blitz',
      log: [
        captured(1, 'A2', P1),
        captured(2, 'B1', P1),
        captured(2, 'B2', P1),
        captured(1, 'C1', P2),
      ],
      expected: [2, 1, 0],
      why: 'most zones captured in a single night',
    },
  ])('$honourId counts $why', ({ honourId, log, spiedBy, expected }) => {
    expect(measures(honourId, log, spiedBy)).toEqual(expected);
  });

  it('only lets players who fought a battle contend for Iron Discipline', () => {
    const context = createHonourContext(record([...BATTLES, FINAL]));
    const neverFought = createHonourContext(record([FINAL]));
    expect(HONOUR_QUERIES['iron-discipline'].isEligible(context, P3)).toBe(
      true,
    );
    expect(HONOUR_QUERIES['iron-discipline'].isEligible(neverFought, P3)).toBe(
      false,
    );
    expect(HONOUR_QUERIES['grande-armee'].isEligible(neverFought, P3)).toBe(
      true,
    );
  });

  it('does not count a tie with cavalry as cavalry being the largest type', () => {
    const tied = [
      formed(1, 'B2', [
        { playerId: P1, units: { cavalry: 3, line: 3 } },
        { playerId: P2, units: { line: 1 } },
      ]),
      decided(1, 'B2', P1),
    ];
    expect(measures('saddle-up', tied)).toEqual([0, 0, 0]);
  });
});
