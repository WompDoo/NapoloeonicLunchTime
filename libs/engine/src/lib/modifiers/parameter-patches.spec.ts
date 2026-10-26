import { TEST_CONFIG } from '../../testing/test-config';
import type { ParameterPatch } from './parameter-patches';
import { applyParameterPatch } from './parameter-patches';
import type { EffectiveParameters } from './parameters';
import { baseParameters } from './parameters';

const BASE = baseParameters(TEST_CONFIG);

function patched(patch: ParameterPatch): EffectiveParameters {
  return applyParameterPatch(BASE, patch, 'test-modifier');
}

describe('applyParameterPatch', () => {
  it.each([
    { operation: 'set' as const, value: 0.5, expected: 0.5 },
    { operation: 'add' as const, value: 0.1, expected: 0.35 },
    { operation: 'multiply' as const, value: 2, expected: 0.5 },
  ])('$operation a number parameter', ({ operation, value, expected }) => {
    expect(
      patched({ kind: 'number', parameter: 'defenderBonus', operation, value })
        .defenderBonus,
    ).toBeCloseTo(expected, 9);
  });

  it('sets a flag', () => {
    expect(
      patched({ kind: 'flag', parameter: 'orderlyRetreat', value: true })
        .orderlyRetreat,
    ).toBe(true);
  });

  it('changes one unit type of a per-type parameter', () => {
    expect(
      patched({
        kind: 'unitTypeNumber',
        parameter: 'moveRange',
        unitType: 'cavalry',
        operation: 'add',
        value: 1,
      }).moveRange,
    ).toEqual({ line: 1, cavalry: 2, skirmishers: 1, artillery: 1 });
  });

  it('changes one cell of a matrix and nothing else', () => {
    const offense = patched({
      kind: 'matrixCell',
      parameter: 'offense',
      row: 'cavalry',
      column: 'skirmishers',
      operation: 'set',
      value: 1,
    }).offense;
    expect(offense.cavalry).toEqual({
      line: 1,
      cavalry: 1,
      skirmishers: 1,
      artillery: 1,
    });
    expect(offense.line).toBe(BASE.offense.line);
  });

  it('adds unit types to a list once, in canonical order', () => {
    const once = patched({
      kind: 'addUnitTypes',
      parameter: 'spyHiddenUnitTypes',
      unitTypes: ['skirmishers', 'line'],
    });
    const twice = applyParameterPatch(
      once,
      {
        kind: 'addUnitTypes',
        parameter: 'spyHiddenUnitTypes',
        unitTypes: ['line'],
      },
      'other',
    );
    expect(twice.spyHiddenUnitTypes).toEqual(['line', 'skirmishers']);
  });

  it('adds a strength bonus attributed to its modifier', () => {
    expect(
      patched({ kind: 'addStrengthBonus', role: 'attacker', value: 0.1 })
        .strengthBonuses,
    ).toEqual([{ source: 'test-modifier', role: 'attacker', value: 0.1 }]);
  });

  it('never mutates the parameters it patches', () => {
    patched({ kind: 'flag', parameter: 'spiesAvailable', value: false });
    expect(BASE.spiesAvailable).toBe(true);
  });
});
