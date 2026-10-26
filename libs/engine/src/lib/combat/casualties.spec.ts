import { EngineContractError } from '../core/engine-error';
import { units } from '../../testing/test-state';
import { TEST_COMBAT_RULES } from '../../testing/test-config';
import { removeCasualties } from './casualties';

const ORDER = TEST_COMBAT_RULES.casualtyRemovalOrder;

describe('removeCasualties', () => {
  it.each([
    {
      name: 'no casualties',
      before: { line: 2 },
      casualties: 0,
      after: { line: 2 },
    },
    {
      name: 'one at a time from the most numerous type (spec example)',
      before: { line: 5, cavalry: 4 },
      casualties: 3,
      after: { line: 3, cavalry: 3 },
    },
    {
      name: 'ties broken line first',
      before: { line: 2, skirmishers: 2, cavalry: 2 },
      casualties: 1,
      after: { line: 1, skirmishers: 2, cavalry: 2 },
    },
    {
      name: 'ties broken skirmishers before cavalry',
      before: { skirmishers: 2, cavalry: 2 },
      casualties: 1,
      after: { skirmishers: 1, cavalry: 2 },
    },
    {
      name: 'most numerous beats tie-break order',
      before: { line: 1, cavalry: 3 },
      casualties: 2,
      after: { line: 1, cavalry: 1 },
    },
    {
      name: 'artillery last even when it is the largest group',
      before: { line: 1, artillery: 4 },
      casualties: 2,
      after: { artillery: 3 },
    },
    {
      name: 'everything if asked',
      before: { cavalry: 1, artillery: 1 },
      casualties: 2,
      after: {},
    },
  ])('removes $name', ({ before, casualties, after }) => {
    expect(removeCasualties(units(before), casualties, ORDER)).toEqual(
      units(after),
    );
  });

  it('refuses to remove more units than exist', () => {
    expect(() => removeCasualties(units({ line: 1 }), 2, ORDER)).toThrow(
      EngineContractError,
    );
  });
});
