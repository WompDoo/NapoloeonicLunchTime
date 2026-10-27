import { Logger } from '@nestjs/common';
import { toPlayerId } from '@lunch-campaign/engine';
import { DatabaseSync } from 'node:sqlite';
import { FakeClock } from '../../testing/fake-clock';
import {
  emptyLobby,
  MONDAY_MORNING,
  playOf,
  SETTINGS,
  startedMatch,
} from '../../testing/match-fixtures';
import { nextResolutionAt } from '../matches/match-play';
import type { StoredMatch } from '../matches/stored-match';
import type { MatchStore } from '../persistence/match-store';
import { SqliteMatchStore } from '../persistence/sqlite-match-store';
import { NightlyResolutionService } from './nightly-resolution.service';

const TUESDAY_RESOLUTION = new Date('2026-11-03T00:00:00Z');

function storeWith(matches: readonly StoredMatch[]): SqliteMatchStore {
  const store = new SqliteMatchStore(new DatabaseSync(':memory:'));
  matches.forEach((match) => {
    const lobby = store.insert({ ...emptyLobby(MONDAY_MORNING), ...match });
    store.update(lobby, match, nextResolutionAt(match, SETTINGS.config));
  });
  return store;
}

function turnOf(store: MatchStore, matchId: string): number {
  const saved = store.find(matchId);
  if (saved === undefined) {
    throw new Error(`No ${matchId}`);
  }
  return playOf(saved.match).state.turnNumber;
}

describe('NightlyResolutionService', () => {
  const match = startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves due nights at start-up and on every tick, until shut down', () => {
    const clock = new FakeClock(TUESDAY_RESOLUTION);
    const store = storeWith([match]);
    const service = new NightlyResolutionService(store, clock, clock, SETTINGS);
    service.onApplicationBootstrap();
    expect(turnOf(store, 'match-1')).toBe(2);
    expect(clock.tickCount).toBe(1);
    clock.advanceTo(new Date('2026-11-04T00:00:00Z'));
    expect(turnOf(store, 'match-1')).toBe(3);
    service.onApplicationShutdown();
    expect(clock.tickCount).toBe(0);
  });

  it('logs a match it cannot resolve and still resolves the others', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const broken: StoredMatch = {
      ...match,
      matchId: 'broken',
      inviteCode: 'invite-broken',
      play: {
        ...playOf(match),
        orders: [{ playerId: toPlayerId('ghost'), orders: [] }],
      },
    };
    const store = storeWith([broken, match]);
    const clock = new FakeClock(TUESDAY_RESOLUTION);
    new NightlyResolutionService(store, clock, clock, SETTINGS).resolveDueMatches();
    expect(turnOf(store, 'match-1')).toBe(2);
    expect(log).toHaveBeenCalledWith('Resolving match broken failed', expect.any(Error));
  });
});
