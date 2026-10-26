import type { MatchScore } from '@lunch-campaign/honours';
import type {
  PlayerId,
  ReplayEvent,
  UnitCounts,
  ZoneConnection,
  ZoneId,
  ZoneKind,
  ZonePosition,
} from '@lunch-campaign/engine';
import type { SpyReport } from './spy-report';
import type { VisibleEvent } from './visible-events';

/** How much of a zone's army the viewer may see. */
export type ArmyVisibility =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'count'; readonly count: number }
  | { readonly kind: 'composition'; readonly units: UnitCounts };

export interface ZoneView {
  readonly zoneId: ZoneId;
  readonly kind: ZoneKind;
  readonly position: ZonePosition;
  readonly ownerId: PlayerId | null;
  readonly army: ArmyVisibility;
}

/** What everyone knows about a player. */
export interface PublicPlayerView {
  readonly playerId: PlayerId;
  readonly seat: number;
  readonly commanderId: string;
  readonly score: number;
  readonly upgrades: readonly string[];
  /** Public once used: the ability is revealed in the replay of the night it was used. */
  readonly abilityUsed: boolean;
  readonly eliminated: boolean;
}

/** What only the viewer knows about themselves. */
export interface OwnPlayerView extends PublicPlayerView {
  readonly supply: number;
}

export interface HonourStandingEntry {
  readonly playerId: PlayerId;
  readonly value: number;
  readonly eligible: boolean;
}

export interface HonourStandingView {
  readonly honourId: string;
  readonly points: number;
  /** Who would earn it if the match ended now; empty while nobody would. */
  readonly leaderIds: readonly PlayerId[];
  readonly entries: readonly HonourStandingEntry[];
}

/**
 * Everything one player may see. Built only by `filterForPlayer`; renderers read nothing else.
 * Hidden data never appears here, not even in fields a UI ignores.
 */
export interface PlayerView {
  readonly viewerId: PlayerId;
  readonly turnNumber: number;
  /** The day collecting orders, e.g. "Wednesday"; `null` once the match is finished. */
  readonly dayLabel: string | null;
  readonly me: OwnPlayerView;
  /** Every player, the viewer included, in seat order. */
  readonly players: readonly PublicPlayerView[];
  /** In zone id order. */
  readonly zones: readonly ZoneView[];
  /** The map's connections: public, like the map itself. */
  readonly connections: readonly ZoneConnection[];
  /** Events in play today. */
  readonly activeEventIds: readonly string[];
  /** Whether the viewer may send a spy today: the match is running, they are in it, and no Fog. */
  readonly spiesAvailable: boolean;
  readonly spyCost: number;
  readonly unitCountsVisible: boolean;
  readonly honours: readonly HonourStandingView[];
  /** The replay of the latest resolved night, filtered for the viewer. */
  readonly lastNight: readonly VisibleEvent[];
  /** The viewer's spy reports from today. */
  readonly spyReports: readonly SpyReport[];
  /** Once the match is finished. */
  readonly finalScore: MatchScore | null;
}

/** The logs a view is built from: every night's replay log, and every spy report. */
export interface MatchLogs {
  readonly replayLog: readonly ReplayEvent[];
  readonly spyLog: readonly SpyReport[];
}
