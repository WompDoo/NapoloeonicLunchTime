import type { INestApplication } from '@nestjs/common';
import type { MatchCreated, PlayerJoined } from '@lunch-campaign/contracts';
import { ApiClient, inSequence } from '../testing/api-client';
import { FakeClock } from '../testing/fake-clock';
import { countingRandom } from '../testing/scripted-random';
import { createApi } from './create-api';

const WEB_ORIGIN = 'https://lunch.example';

describe('the API over HTTP', () => {
  const clock = new FakeClock(new Date('2026-11-02T07:00:00Z'));
  let app: INestApplication;
  let api: ApiClient;
  let baseUrl = '';

  async function newMatch(): Promise<MatchCreated> {
    return (await api.send('POST', '/matches', { body: { timeZone: 'UTC' } }))
      .body as MatchCreated;
  }

  async function join(inviteCode: string, name: string): Promise<PlayerJoined> {
    return (
      await api.send('POST', `/invites/${inviteCode}/players`, { body: { name } })
    ).body as PlayerJoined;
  }

  beforeAll(async () => {
    app = await createApi({
      databasePath: ':memory:',
      clock,
      ticker: clock,
      random: countingRandom(),
      webOrigin: WEB_ORIGIN,
      logLevels: [],
    });
    await app.listen(0);
    baseUrl = await app.getUrl();
    api = new ApiClient(baseUrl);
  });

  afterAll(async () => {
    await app.close();
  });

  it('is healthy', async () => {
    expect(await api.send('GET', '/health')).toEqual({ status: 200, body: { status: 'ok' } });
  });

  it('lets the web client call it from its origin', async () => {
    const response = await fetch(`${baseUrl}/health`, { headers: { origin: WEB_ORIGIN } });
    expect(response.headers.get('access-control-allow-origin')).toBe(WEB_ORIGIN);
  });

  it.each([
    {
      name: 'an unknown route',
      method: 'GET',
      path: '/nowhere',
      request: {},
      status: 404,
      code: 'route.notFound',
    },
    {
      name: 'malformed JSON',
      method: 'POST',
      path: '/matches',
      request: { rawBody: '{"timeZone":' },
      status: 400,
      code: 'request.invalid',
    },
    {
      name: 'a body without a time zone',
      method: 'POST',
      path: '/matches',
      request: { body: {} },
      status: 400,
      code: 'request.invalid',
    },
    {
      name: 'an unknown time zone',
      method: 'POST',
      path: '/matches',
      request: { body: { timeZone: 'Atlantis/Capital' } },
      status: 422,
      code: 'lobby.unknownTimeZone',
    },
    {
      name: 'an unknown invite',
      method: 'POST',
      path: '/invites/nope/players',
      request: { body: { name: 'Ney' } },
      status: 404,
      code: 'lobby.unknownInvite',
    },
    {
      name: 'a view without a token',
      method: 'GET',
      path: '/matches/id-1',
      request: {},
      status: 401,
      code: 'auth.missingToken',
    },
    {
      name: 'a view with an unknown token',
      method: 'GET',
      path: '/matches/id-1',
      request: { token: 'forged' },
      status: 401,
      code: 'auth.unknownToken',
    },
  ])('answers $name with $status $code', async ({ method, path, request, status, code }) => {
    const response = await api.send(method, path, request);
    expect(response.status).toBe(status);
    expect(response.body).toMatchObject({ statusCode: status, code, problems: [] });
  });

  it('keeps players to their own match', async () => {
    const first = await newMatch();
    const second = await newMatch();
    const player = await join(first.inviteCode, 'Ney');
    const response = await api.send('GET', `/matches/${second.matchId}`, {
      token: player.playerToken,
    });
    expect(response).toMatchObject({ status: 403, body: { code: 'auth.wrongMatch' } });
  });

  it('runs a lobby: full, ready without a pick, leaving', async () => {
    const match = await newMatch();
    const players: PlayerJoined[] = [];
    await inSequence(['Ney', 'Soult', 'Davout', 'Lannes'], async (name) => {
      players.push(await join(match.inviteCode, name));
    });
    const full = await api.send('POST', `/invites/${match.inviteCode}/players`, {
      body: { name: 'Bernadotte' },
    });
    expect(full).toMatchObject({ status: 409, body: { code: 'lobby.full' } });
    const [ney, soult] = players as [PlayerJoined, PlayerJoined];
    const unpicked = await api.send('PUT', `/matches/${match.matchId}/ready`, {
      token: ney.playerToken,
      body: { ready: true },
    });
    expect(unpicked).toMatchObject({ status: 409, body: { code: 'lobby.noCommander' } });
    const left = await api.send('DELETE', `/matches/${match.matchId}/players/me`, {
      token: soult.playerToken,
    });
    expect(left).toEqual({ status: 204, body: null });
    const gone = await api.send('GET', `/matches/${match.matchId}`, { token: soult.playerToken });
    expect(gone).toMatchObject({ status: 401, body: { code: 'auth.unknownToken' } });
    const lobby = await api.send('GET', `/matches/${match.matchId}`, { token: ney.playerToken });
    expect(lobby.body).toMatchObject({ phase: 'lobby', members: [{}, {}, {}] });
  });

  it('refuses orders before the start, and explains every refused order', async () => {
    const match = await newMatch();
    const ney = await join(match.inviteCode, 'Ney');
    const soult = await join(match.inviteCode, 'Soult');
    const early = await api.send('PUT', `/matches/${match.matchId}/orders`, {
      token: ney.playerToken,
      body: { orders: [] },
    });
    expect(early).toMatchObject({ status: 409, body: { code: 'match.notStarted' } });
    await inSequence([ney, soult], async (player) => {
      await api.send('PUT', `/matches/${match.matchId}/commander`, {
        token: player.playerToken,
        body: { commanderId: 'moore' },
      });
      await api.send('PUT', `/matches/${match.matchId}/ready`, {
        token: player.playerToken,
        body: { ready: true },
      });
    });
    const refused = await api.send('PUT', `/matches/${match.matchId}/orders`, {
      token: ney.playerToken,
      body: { orders: [{ kind: 'recruit', unitType: 'artillery', count: 9 }] },
    });
    expect(refused).toEqual({
      status: 422,
      body: {
        statusCode: 422,
        code: 'orders.invalid',
        message: '1 orders were refused',
        problems: [{ orderIndex: 0, reason: 'insufficientSupply' }],
      },
    });
    const spy = await api.send('POST', `/matches/${match.matchId}/spies`, {
      token: ney.playerToken,
      body: { zoneId: 'Z9' },
    });
    expect(spy).toMatchObject({ status: 422, body: { code: 'spy.unknownZone' } });
  });
});
