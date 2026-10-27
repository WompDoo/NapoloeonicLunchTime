import type { LobbyRules, MatchTiming } from '@lunch-campaign/content';
import {
  DEFAULT_LOBBY_RULES,
  DEFAULT_MATCH_CONFIG,
  DEFAULT_MATCH_TIMING,
} from '@lunch-campaign/content';
import type { MatchConfig } from '@lunch-campaign/engine';

/** Everything tunable about a match, all from libs/content. */
export interface MatchSettings {
  readonly config: MatchConfig;
  readonly timing: MatchTiming;
  readonly lobby: LobbyRules;
}

export const MATCH_SETTINGS = Symbol('MatchSettings');

export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  config: DEFAULT_MATCH_CONFIG,
  timing: DEFAULT_MATCH_TIMING,
  lobby: DEFAULT_LOBBY_RULES,
};

/** One player per starting capital on the map. */
export function maximumPlayers(settings: MatchSettings): number {
  return settings.config.map.startingCapitals.length;
}
