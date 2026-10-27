import type { ApiErrorCode, OrderProblem } from '@lunch-campaign/contracts';

/** A request the rules refuse. The HTTP layer maps the code to a status; clients translate the code. */
export class DomainError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly problems: readonly OrderProblem[],
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function domainError(code: ApiErrorCode, message: string): DomainError {
  return new DomainError(code, message, []);
}
