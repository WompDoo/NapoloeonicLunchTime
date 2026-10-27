import type {
  MatchConfig,
  MatchState,
  PlayerId,
  PlayerOrders,
  ReplayEvent,
} from '@lunch-campaign/engine';
import { isMatchFinished } from '@lunch-campaign/engine';
import type { SpyReport } from '@lunch-campaign/player-view';
import type { TurnWindow } from '../calendar/match-calendar';

/** A secret pick: everyone else only learns whether one was made, until the match starts. */
export interface CommanderPick {
  readonly commanderId: string;
  /** Only a player with a pick can be ready; changing the pick clears it. */
  readonly ready: boolean;
}

export interface LobbyMember {
  readonly playerId: PlayerId;
  readonly name: string;
  readonly pick: CommanderPick | null;
}

export interface ReadyMember extends LobbyMember {
  readonly pick: CommanderPick & { readonly ready: true };
}

/** The started match: the engine's state and logs, its calendar, and today's submissions. */
export interface MatchPlay {
  readonly startedAt: string;
  readonly calendar: readonly TurnWindow[];
  readonly state: MatchState;
  readonly replayLog: readonly ReplayEvent[];
  readonly spyLog: readonly SpyReport[];
  /** Each player's last submission for the open day; cleared when the night resolves. */
  readonly orders: readonly PlayerOrders[];
}

/** A match from lobby to final score. `play` is null until everyone is ready. */
export interface StoredMatch {
  readonly matchId: string;
  readonly inviteCode: string;
  readonly timeZone: string;
  readonly createdAt: string;
  readonly members: readonly LobbyMember[];
  readonly play: MatchPlay | null;
}

export type MatchPhase = 'lobby' | 'running' | 'finished';

export function isReadyMember(member: LobbyMember): member is ReadyMember {
  return member.pick !== null && member.pick.ready;
}

export function playPhase(
  play: MatchPlay,
  config: MatchConfig,
): Exclude<MatchPhase, 'lobby'> {
  return isMatchFinished(play.state, config) ? 'finished' : 'running';
}
