import { EngineContractError } from '../core/engine-error';
import { TEST_CONFIG } from '../../testing/test-config';
import {
  findCommander,
  findEvent,
  findUpgrade,
  isKnownUpgrade,
} from './content-queries';

describe('content queries', () => {
  it('finds content by id', () => {
    expect(findUpgrade(TEST_CONFIG, 'drill').id).toBe('drill');
    expect(findCommander(TEST_CONFIG, 'marshal').ability.id).toBe('forward');
    expect(findEvent(TEST_CONFIG, 'levy').id).toBe('levy');
    expect(isKnownUpgrade(TEST_CONFIG, 'drill')).toBe(true);
    expect(isKnownUpgrade(TEST_CONFIG, 'cannons')).toBe(false);
  });

  it('throws for unknown content', () => {
    expect(() => findUpgrade(TEST_CONFIG, 'cannons')).toThrow(
      new EngineContractError('Missing upgrade cannons'),
    );
  });
});
