import { DEFAULT_MATCH_CONFIG, FOG } from '@lunch-campaign/content';
import type { ScenarioOptions } from '@lunch-campaign/content/testing';
import { createV0State, P1, P2, P3 } from '@lunch-campaign/content/testing';
import type { MatchState, UnitCounts } from '@lunch-campaign/engine';
import {
  createEventModifier,
  createUnitCounts,
  toZoneId,
} from '@lunch-campaign/engine';
import type { MatchupPreview } from './matchup-preview';
import { previewMatchup } from './matchup-preview';
import type { MatchLogs } from './player-view';
import type { SpyReport } from './spy-report';

const B2 = toZoneId('B2');
const NO_LOGS: MatchLogs = { replayLog: [], spyLog: [] };

function stateWith(options: ScenarioOptions): MatchState {
  return createV0State(options);
}

function report(overrides: Partial<SpyReport>): SpyReport {
  return {
    playerId: P1,
    turnNumber: 1,
    zoneId: B2,
    ownerId: P2,
    units: createUnitCounts({}),
    unidentified: 0,
    ...overrides,
  };
}

function preview(
  state: MatchState,
  units: Partial<UnitCounts>,
  spyLog: readonly SpyReport[] = [],
): MatchupPreview {
  return previewMatchup(
    state,
    { ...NO_LOGS, spyLog },
    P1,
    { toZoneId: B2, units: createUnitCounts(units) },
    DEFAULT_MATCH_CONFIG,
  );
}

const DEFENDED = stateWith({
  zones: { B2: { owner: P2, units: { line: 2 } } },
});
const CAVALRY_HINT = {
  unitType: 'cavalry',
  beats: ['skirmishers'],
  beatenBy: ['line'],
};

describe('previewMatchup', () => {
  it.each([
    {
      name: 'a move into your own zone as reinforcement',
      state: stateWith({ zones: { B2: { owner: P1, units: { line: 1 } } } }),
      expected: { kind: 'reinforcement' },
    },
    {
      name: 'an empty neutral zone as unopposed',
      state: stateWith({}),
      expected: { kind: 'unopposed' },
    },
    {
      name: 'an empty enemy zone as unopposed',
      state: stateWith({ zones: { B2: { owner: P2 } } }),
      expected: { kind: 'unopposed' },
    },
    {
      name: 'a defended zone you have not spied as its count, with counter hints',
      state: DEFENDED,
      expected: { kind: 'countOnly', defenderCount: 2, hints: [CAVALRY_HINT] },
    },
    {
      name: 'any zone in Fog without a count',
      state: stateWith({
        zones: { B2: { owner: P2, units: { line: 2 } } },
        extraModifiers: [createEventModifier(FOG, 1)],
      }),
      expected: { kind: 'countHidden', hints: [CAVALRY_HINT] },
    },
    {
      name: 'a neutral zone in Fog without a count',
      state: stateWith({ extraModifiers: [createEventModifier(FOG, 1)] }),
      expected: { kind: 'countHidden', hints: [CAVALRY_HINT] },
    },
  ])('shows $name', ({ state, expected }) => {
    expect(preview(state, { cavalry: 4 })).toEqual(expected);
  });

  it.each([
    { cavalry: 4, attacker: 4, defender: 5, likelyWinner: 'defender' },
    { cavalry: 6, attacker: 6, defender: 5, likelyWinner: 'you' },
  ])(
    'estimates $cavalry cavalry into 2 spied line: $attacker against $defender',
    ({ cavalry, attacker, defender, likelyWinner }) => {
      const result = preview(DEFENDED, { cavalry }, [
        report({ units: createUnitCounts({ line: 2 }) }),
      ]);
      expect(result).toMatchObject({
        kind: 'estimate',
        unidentified: 0,
        estimate: {
          attacker: { totalStrength: attacker },
          defender: { totalStrength: defender },
          likelyWinner,
        },
      });
    },
  );

  it('leaves units the spy could not identify out of the estimate, and says how many', () => {
    const result = preview(DEFENDED, { cavalry: 6 }, [
      report({ units: createUnitCounts({ line: 2 }), unidentified: 3 }),
    ]);
    expect(result).toMatchObject({ kind: 'estimate', unidentified: 3 });
  });

  it.each([
    {
      name: 'only unidentified units as a count',
      spied: report({ unidentified: 3 }),
      expected: { kind: 'countOnly', defenderCount: 3 },
    },
    {
      name: 'an empty zone as unopposed',
      spied: report({ ownerId: null }),
      expected: { kind: 'unopposed' },
    },
  ])('reads a report of $name', ({ spied, expected }) => {
    expect(preview(DEFENDED, { cavalry: 4 }, [spied])).toMatchObject(expected);
  });

  it.each([
    {
      name: 'from another day',
      spied: report({ turnNumber: 0, units: createUnitCounts({ line: 2 }) }),
    },
    {
      name: 'by another player',
      spied: report({ playerId: P3, units: createUnitCounts({ line: 2 }) }),
    },
    {
      name: 'on another zone',
      spied: report({
        zoneId: toZoneId('C2'),
        units: createUnitCounts({ line: 2 }),
      }),
    },
  ])('ignores a report $name', ({ spied }) => {
    expect(preview(DEFENDED, { cavalry: 4 }, [spied])).toMatchObject({
      kind: 'countOnly',
    });
  });

  it('never reveals more than the count without a spy report', () => {
    const otherArmy = stateWith({
      zones: { B2: { owner: P2, units: { skirmishers: 1, artillery: 1 } } },
    });
    expect(preview(otherArmy, { cavalry: 4, line: 1 })).toEqual(
      preview(DEFENDED, { cavalry: 4, line: 1 }),
    );
  });
});
