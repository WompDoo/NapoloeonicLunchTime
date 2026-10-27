import type { Order, PlayerId } from '@lunch-campaign/engine';
import type { PlayerView } from '@lunch-campaign/player-view';

export interface LobbyMemberDto {
  readonly playerId: PlayerId;
  readonly name: string;
  /** Picks stay secret until the match starts: everyone sees only whether a pick was made. */
  readonly hasPicked: boolean;
  readonly ready: boolean;
}

/** A match that has not started: players join, pick a commander and press ready. */
export interface LobbyDto {
  readonly phase: 'lobby';
  readonly matchId: string;
  readonly inviteCode: string;
  readonly timeZone: string;
  readonly yourPlayerId: PlayerId;
  readonly yourCommanderId: string | null;
  readonly members: readonly LobbyMemberDto[];
  readonly commanderIds: readonly string[];
  readonly minimumPlayers: number;
  readonly maximumPlayers: number;
}

/** One match day: when its orders close and when its night resolves. */
export interface TurnWindowDto {
  readonly turnNumber: number;
  /** The game day's name from the schedule, e.g. "Monday", whatever the calendar day. */
  readonly dayLabel: string;
  /** The calendar date in the match's time zone, YYYY-MM-DD. */
  readonly date: string;
  /** ISO 8601 instants, in UTC. */
  readonly deadlineAt: string;
  readonly resolvesAt: string;
}

export interface RosterEntryDto {
  readonly playerId: PlayerId;
  readonly name: string;
}

/** A started match, as one player may see it. */
export interface PlayingMatchDto {
  readonly phase: 'running' | 'finished';
  readonly matchId: string;
  readonly timeZone: string;
  readonly roster: readonly RosterEntryDto[];
  readonly calendar: readonly TurnWindowDto[];
  /** The day taking orders and spies; null between its deadline and the night's resolution, and once finished. */
  readonly openDay: TurnWindowDto | null;
  readonly view: PlayerView;
  /** Your own submission for the open day, as last saved. */
  readonly yourOrders: readonly Order[];
}

export type MatchDto = LobbyDto | PlayingMatchDto;
