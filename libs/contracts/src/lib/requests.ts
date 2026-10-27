import type { Order, PlayerId } from '@lunch-campaign/engine';

export interface CreateMatchRequest {
  /** IANA time zone of the match's deadlines, e.g. "Europe/Tallinn". */
  readonly timeZone: string;
}

export interface MatchCreated {
  readonly matchId: string;
  /** Share it as an invite link: anyone holding it can join until the match starts. */
  readonly inviteCode: string;
}

export interface JoinMatchRequest {
  readonly name: string;
}

export interface PlayerJoined {
  readonly matchId: string;
  readonly playerId: PlayerId;
  /** Shown once: send it as a bearer token on every call. It is the player's only key to their view. */
  readonly playerToken: string;
}

export interface PickCommanderRequest {
  readonly commanderId: string;
}

export interface ReadyRequest {
  readonly ready: boolean;
}

/** Replaces the player's whole submission for the open day: the last one counts. */
export interface SubmitOrdersRequest {
  readonly orders: readonly Order[];
}

export interface SpyRequest {
  readonly zoneId: string;
}
