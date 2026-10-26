import type {
  CityPointsScoringRule,
  ScoringRule,
} from '../../config/match-config';
import { isCityZone } from '../../map/map-queries';
import type { PointsAwardedEvent } from '../../replay/replay-events';
import type { MatchState, PlayerState } from '../../state/match-state';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

type ScoringRuleHandlers = {
  readonly [TKind in ScoringRule['kind']]: (
    resolution: ResolutionState,
    rule: Extract<ScoringRule, { readonly kind: TKind }>,
    context: TurnContext,
  ) => ResolutionState;
};

interface CityPointsAward {
  readonly player: PlayerState;
  readonly citiesHeld: number;
  readonly points: number;
}

const SCORING_RULE_HANDLERS: ScoringRuleHandlers = {
  cityPoints: awardCityPoints,
};

/** Applies the scoring rules of this turn's schedule entry; most nights have none. */
export function applyScoringPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  return context.scheduleEntry.scoring.reduce(
    (current, rule): ResolutionState =>
      SCORING_RULE_HANDLERS[rule.kind](current, rule, context),
    resolution,
  );
}

/** Every city held (owned, even if empty; capitals included) scores the rule's points. */
function awardCityPoints(
  resolution: ResolutionState,
  rule: CityPointsScoringRule,
  context: TurnContext,
): ResolutionState {
  const awards = resolution.match.players.map((player): CityPointsAward => {
    const citiesHeld = countCitiesHeld(resolution.match, player, context);
    return { player, citiesHeld, points: citiesHeld * rule.pointsPerCity };
  });
  return appendEvents(
    resolution,
    {
      ...resolution.match,
      players: awards.map(
        ({ player, points }): PlayerState => ({
          ...player,
          score: player.score + points,
        }),
      ),
    },
    awards.map(
      ({ player, citiesHeld, points }): PointsAwardedEvent => ({
        type: 'PointsAwarded',
        turnNumber: context.turnNumber,
        playerId: player.playerId,
        source: 'cityPoints',
        citiesHeld,
        points,
      }),
    ),
  );
}

function countCitiesHeld(
  state: MatchState,
  player: PlayerState,
  context: TurnContext,
): number {
  return state.zones.filter(
    (zone): boolean =>
      zone.ownerId === player.playerId &&
      isCityZone(context.config.map, zone.zoneId),
  ).length;
}
