import type { HonourId } from '@lunch-campaign/content';
import { HONOUR_IDS } from '@lunch-campaign/content';
import type { MatchConfig, PlayerId } from '@lunch-campaign/engine';
import {
  compareInOrder,
  EngineContractError,
  requirePresent,
} from '@lunch-campaign/engine';
import type { HonourContext } from './honour-context';
import {
  createHonourContext,
  finalStandingOf,
  unitsLostInBattle,
} from './honour-context';
import type { HonourDirection } from './honour-queries';
import { HONOUR_QUERIES } from './honour-queries';
import { eventsOfType, playerIds, sumOf } from './log-queries';
import type { MatchRecord } from './match-record';

export interface HonourAward {
  readonly honourId: HonourId;
  readonly points: number;
  /** Tied players each get the full points. Empty when nobody earned it. */
  readonly winnerIds: readonly PlayerId[];
}

export interface PlayerFinalScore {
  readonly playerId: PlayerId;
  readonly cityPoints: number;
  readonly honourPoints: number;
  readonly total: number;
  readonly citiesHeld: number;
  readonly unitsLost: number;
  /** 1 is first. Players tied on every tie-break share a rank. */
  readonly rank: number;
}

export interface MatchScore {
  readonly honours: readonly HonourAward[];
  /** By rank, then seat. */
  readonly players: readonly PlayerFinalScore[];
  /** More than one means a shared victory. */
  readonly winnerIds: readonly PlayerId[];
}

interface Contender {
  readonly playerId: PlayerId;
  readonly value: number;
}

const BEST_VALUE: Readonly<
  Record<HonourDirection, (values: readonly number[]) => number>
> = {
  most: (values): number => Math.max(...values),
  fewest: (values): number => Math.min(...values),
};

const IS_AWARDABLE: Readonly<
  Record<HonourDirection, (best: number) => boolean>
> = {
  most: (best): boolean => best > 0,
  fewest: (): boolean => true,
};

/**
 * Final scoring after Friday: city points from the log, plus the match's honours, ranked by total, then
 * more cities held at the end, then fewer units lost in battle. Players tied on all three share the victory.
 * Reads only the logs.
 */
export function scoreMatch(
  record: MatchRecord,
  honourIds: readonly string[],
  config: MatchConfig,
): MatchScore {
  const context = createHonourContext(record);
  const players = playerIds(record);
  const honours = honourIds.map(
    (honourId): HonourAward =>
      awardHonour(
        context,
        requireHonourId(honourId),
        honourPoints(config, honourId),
        players,
      ),
  );
  const scores = players.map(
    (playerId): Omit<PlayerFinalScore, 'rank'> =>
      scoreOf(context, playerId, honours),
  );
  const ranked = scores
    .map(
      (score): PlayerFinalScore => ({ ...score, rank: rankOf(score, scores) }),
    )
    .toSorted((left, right): number => left.rank - right.rank);
  return {
    honours,
    players: ranked,
    winnerIds: ranked
      .filter((score): boolean => score.rank === 1)
      .map((score): PlayerId => score.playerId),
  };
}

export function awardHonour(
  context: HonourContext,
  honourId: HonourId,
  points: number,
  players: readonly PlayerId[],
): HonourAward {
  const query = HONOUR_QUERIES[honourId];
  const contenders = players
    .filter((playerId): boolean => query.isEligible(context, playerId))
    .map(
      (playerId): Contender => ({
        playerId,
        value: query.measure(context, playerId),
      }),
    );
  const best = BEST_VALUE[query.direction](
    contenders.map((contender): number => contender.value),
  );
  return {
    honourId,
    points,
    winnerIds: IS_AWARDABLE[query.direction](best)
      ? contenders
          .filter((contender): boolean => contender.value === best)
          .map((contender): PlayerId => contender.playerId)
      : [],
  };
}

function scoreOf(
  context: HonourContext,
  playerId: PlayerId,
  honours: readonly HonourAward[],
): Omit<PlayerFinalScore, 'rank'> {
  const cityPoints = sumOf(
    eventsOfType(context.record, 'PointsAwarded')
      .filter((event): boolean => event.playerId === playerId)
      .map((event): number => event.points),
  );
  const honourPoints = sumOf(
    honours
      .filter((award): boolean => award.winnerIds.includes(playerId))
      .map((award): number => award.points),
  );
  return {
    playerId,
    cityPoints,
    honourPoints,
    total: cityPoints + honourPoints,
    citiesHeld: finalStandingOf(context, playerId).citiesHeld,
    unitsLost: unitsLostInBattle(context, playerId),
  };
}

/** One plus the number of players strictly ahead on total, then cities held, then units lost. */
function rankOf(
  score: Omit<PlayerFinalScore, 'rank'>,
  scores: readonly Omit<PlayerFinalScore, 'rank'>[],
): number {
  return (
    1 +
    scores.filter((other): boolean => compareStanding(other, score) < 0).length
  );
}

const compareStanding = compareInOrder<Omit<PlayerFinalScore, 'rank'>>([
  (left, right): number => right.total - left.total,
  (left, right): number => right.citiesHeld - left.citiesHeld,
  (left, right): number => left.unitsLost - right.unitsLost,
]);

function requireHonourId(honourId: string): HonourId {
  if (!isHonourId(honourId)) {
    throw new EngineContractError(`Unknown honour ${honourId}`);
  }
  return honourId;
}

function isHonourId(honourId: string): honourId is HonourId {
  return HONOUR_IDS.some((known): boolean => known === honourId);
}

function honourPoints(config: MatchConfig, honourId: string): number {
  return requirePresent(
    config.honours.pool.find((honour): boolean => honour.id === honourId),
    `honour ${honourId} in the match config`,
  ).points;
}
