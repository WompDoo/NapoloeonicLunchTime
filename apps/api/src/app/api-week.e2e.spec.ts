import type { INestApplication } from '@nestjs/common';
import type {
  MatchCreated,
  PlayerJoined,
  PlayingMatchDto,
  TurnWindowDto,
} from '@lunch-campaign/contracts';
import type { PlayerId, PlayerOrders } from '@lunch-campaign/engine';
import {
  drawSeating,
  requirePresent,
  toPlayerId,
} from '@lunch-campaign/engine';
import { WEEK_ORDERS, WEEK_SEATING } from '@lunch-campaign/honours/testing';
import type { SpyAction } from '@lunch-campaign/player-view/testing';
import {
  spiedWeekView,
  WEEK_SEED,
  WEEK_SPIES,
} from '@lunch-campaign/player-view/testing';
import { ApiClient, inSequence } from '../testing/api-client';
import { FakeClock } from '../testing/fake-clock';
import { scriptedRandom } from '../testing/scripted-random';
import { createApi } from './create-api';

/*
 * The scripted M3 week, played through HTTP with a fake clock: four players join by invite, pick and get
 * ready, then spy, order and wait for each night. Every view the API returns must be exactly the PlayerView
 * the libraries build for that player, with the API's player ids.
 */

const API_PLAYERS: readonly PlayerId[] = [
  'player-a',
  'player-b',
  'player-c',
  'player-d',
].map(toPlayerId);
const FIRST_PLAYER = requirePresent(API_PLAYERS[0], 'the first player');
const MONDAY_MORNING = new Date('2026-11-02T07:00:00Z');
const ONE_MINUTE_MS = 60_000;
const DAYS = WEEK_ORDERS.length;

/** Seats come from the match seed, so the scripted seat k is played by whoever draws seat k. */
const SEATING = drawSeating(
  API_PLAYERS.map((playerId) => ({ playerId, commanderId: 'any' })),
  WEEK_SEED,
);

function scriptedSeatOf(apiPlayer: PlayerId): (typeof WEEK_SEATING)[number] {
  const seat = requirePresent(
    SEATING.find((seating) => seating.playerId === apiPlayer),
    apiPlayer,
  ).seat;
  return requirePresent(
    WEEK_SEATING.find((seating) => seating.seat === seat),
    `seat ${seat}`,
  );
}

function apiPlayerFor(scriptedPlayer: PlayerId): PlayerId {
  return requirePresent(
    API_PLAYERS.find(
      (apiPlayer) => scriptedSeatOf(apiPlayer).playerId === scriptedPlayer,
    ),
    scriptedPlayer,
  );
}

/** The scripted view with every scripted player id replaced by the API player in that seat. */
function renamed<T>(value: T): T {
  return JSON.parse(
    API_PLAYERS.reduce(
      (json, apiPlayer) =>
        json.replaceAll(scriptedSeatOf(apiPlayer).playerId, apiPlayer),
      JSON.stringify(value),
    ),
  ) as T;
}

describe('a full week through the API', () => {
  const clock = new FakeClock(MONDAY_MORNING);
  const tokens = new Map<PlayerId, string>();
  let app: INestApplication;
  let api: ApiClient;
  let matchId = '';

  function tokenOf(playerId: PlayerId): string {
    return requirePresent(tokens.get(playerId), `token of ${playerId}`);
  }

  async function viewOf(playerId: PlayerId): Promise<PlayingMatchDto> {
    const response = await api.send('GET', `/matches/${matchId}`, {
      token: tokenOf(playerId),
    });
    expect(response.status).toBe(200);
    return response.body as PlayingMatchDto;
  }

  async function openDayNow(): Promise<TurnWindowDto> {
    const { openDay } = await viewOf(FIRST_PLAYER);
    if (openDay === null) {
      throw new Error('No day is open');
    }
    return openDay;
  }

  async function sendSpy(spy: SpyAction): Promise<void> {
    const response = await api.send('POST', `/matches/${matchId}/spies`, {
      token: tokenOf(apiPlayerFor(spy.playerId)),
      body: { zoneId: spy.zoneId },
    });
    expect(response.status).toBe(201);
  }

  async function submit(submission: PlayerOrders): Promise<void> {
    const response = await api.send('PUT', `/matches/${matchId}/orders`, {
      token: tokenOf(apiPlayerFor(submission.playerId)),
      body: { orders: submission.orders },
    });
    expect(response.status).toBe(200);
  }

  async function expectEveryViewToMatch(day: number): Promise<void> {
    await inSequence(API_PLAYERS, async (apiPlayer) => {
      expect((await viewOf(apiPlayer)).view).toEqual(
        renamed(spiedWeekView(day, scriptedSeatOf(apiPlayer).playerId)),
      );
    });
  }

  async function playDay(day: number): Promise<void> {
    await inSequence(
      requirePresent(WEEK_SPIES[day], `spies of day ${day}`),
      sendSpy,
    );
    await inSequence(
      requirePresent(WEEK_ORDERS[day], `orders of day ${day}`),
      submit,
    );
    await expectEveryViewToMatch(day);
    const today = await openDayNow();
    clock.advanceTo(new Date(Date.parse(today.deadlineAt) + ONE_MINUTE_MS));
    const late = await api.send('PUT', `/matches/${matchId}/orders`, {
      token: tokenOf(FIRST_PLAYER),
      body: { orders: [] },
    });
    expect(late.status).toBe(409);
    clock.advanceTo(new Date(today.resolvesAt));
  }

  beforeAll(async () => {
    app = await createApi({
      databasePath: ':memory:',
      clock,
      ticker: clock,
      random: scriptedRandom({
        ids: ['match-1', ...API_PLAYERS],
        secrets: [
          'invite-1',
          ...API_PLAYERS.map((playerId) => `token-of-${playerId}`),
          WEEK_SEED,
        ],
      }),
      webOrigin: null,
      logLevels: [],
    });
    await app.listen(0);
    api = new ApiClient(await app.getUrl());
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens a lobby that four players join through the invite', async () => {
    const created = await api.send('POST', '/matches', {
      body: { timeZone: 'Europe/Tallinn' },
    });
    expect(created).toEqual({
      status: 201,
      body: { matchId: 'match-1', inviteCode: 'invite-1' },
    });
    matchId = (created.body as MatchCreated).matchId;
    await inSequence(API_PLAYERS, async (playerId) => {
      const joined = await api.send('POST', '/invites/invite-1/players', {
        body: { name: `Name of ${playerId}` },
      });
      expect(joined.status).toBe(201);
      const player = joined.body as PlayerJoined;
      expect(player.playerId).toBe(playerId);
      tokens.set(player.playerId, player.playerToken);
    });
  });

  it('starts when the last player is ready', async () => {
    await inSequence(API_PLAYERS, async (playerId) => {
      const picked = await api.send('PUT', `/matches/${matchId}/commander`, {
        token: tokenOf(playerId),
        body: { commanderId: scriptedSeatOf(playerId).commanderId },
      });
      expect(picked.body).toMatchObject({ phase: 'lobby' });
    });
    await inSequence(API_PLAYERS, async (playerId, index) => {
      const ready = await api.send('PUT', `/matches/${matchId}/ready`, {
        token: tokenOf(playerId),
        body: { ready: true },
      });
      expect(ready.body).toMatchObject({
        phase: index === API_PLAYERS.length - 1 ? 'running' : 'lobby',
      });
    });
  });

  it('plays Monday to Friday, closing each day at the deadline and resolving each night', async () => {
    await inSequence(
      Array.from({ length: DAYS }, (_, day) => day),
      playDay,
    );
  });

  it('ends with the same views and final score as the scripted week', async () => {
    await expectEveryViewToMatch(DAYS);
    const final = await viewOf(FIRST_PLAYER);
    expect(final).toMatchObject({ phase: 'finished', openDay: null });
    expect(final.view.finalScore?.winnerIds).toEqual([
      apiPlayerFor(toPlayerId('murat-player')),
    ]);
  });

  it('never sent the match seed, nor any token but a joining player’s own', () => {
    const tokensIn = (text: string): readonly string[] =>
      [...tokens.values()].filter((token) => text.includes(token));
    expect(api.exchanges.length).toBeGreaterThan(DAYS * API_PLAYERS.length);
    api.exchanges.forEach((exchange) => {
      expect(exchange.text).not.toContain(WEEK_SEED);
    });
    expect(
      api.exchanges
        .filter((exchange) => exchange.token !== undefined)
        .flatMap((exchange) => tokensIn(exchange.text)),
    ).toEqual([]);
    expect(
      api.exchanges
        .filter((exchange) => exchange.token === undefined)
        .map((exchange) => tokensIn(exchange.text)),
    ).toEqual([[], ...API_PLAYERS.map((playerId) => [tokenOf(playerId)])]);
  });
});
