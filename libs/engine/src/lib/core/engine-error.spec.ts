import { EngineContractError, requirePresent } from './engine-error';

describe('engine errors', () => {
  it('names contract errors', () => {
    const error = new EngineContractError('broken');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('EngineContractError');
    expect(error.message).toBe('broken');
  });

  it('returns present values', () => {
    expect(requirePresent(0, 'a number')).toBe(0);
  });

  it('throws a contract error for missing values', () => {
    expect(() => requirePresent(undefined, 'zone X9')).toThrow(
      new EngineContractError('Missing zone X9'),
    );
  });
});
