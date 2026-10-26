/**
 * Thrown when the engine is called with input that breaks its contract
 * (unknown players, a finished match, an invalid map). Invalid player orders are
 * not errors: they are skipped and logged as `OrderRejected` events.
 */
export class EngineContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EngineContractError';
  }
}

export function requirePresent<T>(
  value: T | undefined,
  description: string,
): T {
  if (value === undefined) {
    throw new EngineContractError(`Missing ${description}`);
  }
  return value;
}
