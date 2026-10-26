import type { PlayerId, ReplayEvent } from '@lunch-campaign/engine';

/** The one thing Spymaster needs from a spy report. Spy reports themselves arrive in Milestone 4. */
export interface SpyLogEntry {
  readonly playerId: PlayerId;
}

/** Everything honours and final scoring read: the logs, never the match state. */
export interface MatchRecord {
  /** Every night's replay log, concatenated in order. */
  readonly replayLog: readonly ReplayEvent[];
  /** Every spy report of the match (spies are daytime actions, logged separately). */
  readonly spyLog: readonly SpyLogEntry[];
}
