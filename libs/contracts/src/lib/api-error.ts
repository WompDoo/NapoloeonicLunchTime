import type { OrderRejectionReason } from '@lunch-campaign/engine';
import type { SpyRejectionReason } from '@lunch-campaign/player-view';

/**
 * Stable codes for every error the API returns. Clients translate the code; the message is an English
 * fallback for logs and developers, never shown as is.
 */
export type ApiErrorCode =
  | 'request.invalid'
  | 'route.notFound'
  | 'auth.missingToken'
  | 'auth.unknownToken'
  | 'auth.wrongMatch'
  | 'match.notFound'
  | 'match.notStarted'
  | 'match.finished'
  | 'match.conflict'
  | 'lobby.unknownTimeZone'
  | 'lobby.unknownInvite'
  | 'lobby.full'
  | 'lobby.started'
  | 'lobby.unknownCommander'
  | 'lobby.noCommander'
  | 'day.closed'
  | 'zone.unknown'
  | 'orders.invalid'
  | `spy.${SpyRejectionReason}`
  | 'internal';

/** Why one order in a submission was refused. */
export interface OrderProblem {
  /** Position of the order in the submission. */
  readonly orderIndex: number;
  readonly reason: OrderRejectionReason;
}

export interface ApiError {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly message: string;
  /** For `orders.invalid`: every order that was refused. Empty otherwise. */
  readonly problems: readonly OrderProblem[];
}
