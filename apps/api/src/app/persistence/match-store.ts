import type { PlayerId } from '@lunch-campaign/engine';
import type { StoredMatch } from '../matches/stored-match';

/** A match as last saved, with the version an update must name. */
export interface SavedMatch {
  readonly match: StoredMatch;
  readonly version: number;
}

/** Who a player token belongs to. Tokens are stored only as hashes. */
export interface PlayerKey {
  readonly matchId: string;
  readonly playerId: PlayerId;
}

export interface PlayerTokenRecord extends PlayerKey {
  readonly tokenHash: string;
}

/**
 * Where matches live. Every write names the version it read, so two requests changing the same match
 * at once can never silently overwrite each other: the second one fails with `match.conflict`.
 */
export interface MatchStore {
  readonly insert: (match: StoredMatch) => SavedMatch;
  readonly update: (
    saved: SavedMatch,
    next: StoredMatch,
    nextResolutionAt: string | null,
  ) => SavedMatch;
  readonly find: (matchId: string) => SavedMatch | undefined;
  readonly findByInviteCode: (inviteCode: string) => SavedMatch | undefined;
  /** Ids of running matches whose next night is due, oldest first. */
  readonly dueForResolution: (now: Date) => readonly string[];
  readonly addPlayerToken: (token: PlayerTokenRecord) => void;
  readonly removePlayerTokens: (key: PlayerKey) => void;
  readonly findPlayerByTokenHash: (tokenHash: string) => PlayerKey | undefined;
  /** Runs the work atomically: everything it wrote is kept, or none of it. */
  readonly inTransaction: <T>(work: () => T) => T;
}

export const MATCH_STORE = Symbol('MatchStore');
