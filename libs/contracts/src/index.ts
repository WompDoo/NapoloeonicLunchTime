export * from './lib/api-error';
export * from './lib/match-dto';
export * from './lib/requests';
export * from './lib/decode-requests';

/* Wire types the web needs from the libraries behind the API, so it imports contracts alone. */
export type {
  AbilityRevealed,
  ArmyVisibility,
  BattleFormedSummary,
  BattleOutcomeSummary,
  CountedEvent,
  CounterHint,
  HonourAward,
  HonourStandingEntry,
  HonourStandingView,
  MatchScore,
  MatchupPreview,
  OrderRulesView,
  PlayerFinalScore,
  PlayerView,
  PublicPlayerView,
  SpyReport,
  StrengthEstimate,
  VisibleAbilityTarget,
  VisibleEvent,
  ZoneView,
} from '@lunch-campaign/player-view';
