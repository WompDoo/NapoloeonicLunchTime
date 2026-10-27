import { requirePresent, toPlayerId } from '@lunch-campaign/engine';
import { DatabaseSync } from 'node:sqlite';
import {
  emptyLobby,
  MONDAY_MORNING,
  SETTINGS,
  startedMatch,
} from '../../testing/match-fixtures';
import type { DomainError } from '../errors/domain-error';
import { nextResolutionAt } from '../matches/match-play';
import type { StoredMatch } from '../matches/stored-match';
import { SqliteMatchStore } from './sqlite-match-store';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as DomainError).code;
  }
  throw new Error('Expected a domain error');
}

function newStore(): SqliteMatchStore {
  return new SqliteMatchStore(new DatabaseSync(':memory:'));
}

function otherLobby(): StoredMatch {
  return {
    ...emptyLobby(MONDAY_MORNING),
    matchId: 'match-2',
    inviteCode: 'invite-2',
  };
}

describe('SqliteMatchStore', () => {
  it('saves and finds matches by id and invite code', () => {
    const store = newStore();
    const saved = store.insert(emptyLobby(MONDAY_MORNING));
    expect(saved.version).toBe(1);
    expect(store.find('match-1')).toEqual(saved);
    expect(store.findByInviteCode('invite-1')).toEqual(saved);
    expect(store.find('nowhere')).toBeUndefined();
    expect(store.findByInviteCode('nowhere')).toBeUndefined();
  });

  it('bumps the version on every update and refuses a stale one', () => {
    const store = newStore();
    const first = store.insert(emptyLobby(MONDAY_MORNING));
    const second = store.update(
      first,
      { ...first.match, timeZone: 'UTC' },
      null,
    );
    expect(second.version).toBe(2);
    expect(
      requirePresent(store.find('match-1'), 'match-1').match.timeZone,
    ).toBe('UTC');
    expect(codeOf(() => store.update(first, first.match, null))).toBe(
      'match.conflict',
    );
  });

  it('lists the matches whose next night is due, oldest first', () => {
    const store = newStore();
    const started = startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed');
    const lobby = store.insert(emptyLobby(MONDAY_MORNING));
    store.update(lobby, started, nextResolutionAt(started, SETTINGS.config));
    const other = store.insert(otherLobby());
    store.update(other, other.match, '2026-11-02T23:00:00.000Z');
    expect(store.dueForResolution(new Date('2026-11-02T22:00:00Z'))).toEqual(
      [],
    );
    expect(store.dueForResolution(new Date('2026-11-03T00:00:00Z'))).toEqual([
      'match-2',
      'match-1',
    ]);
  });

  it('keeps player tokens by hash', () => {
    const store = newStore();
    store.insert(emptyLobby(MONDAY_MORNING));
    const key = { matchId: 'match-1', playerId: toPlayerId('player-a') };
    store.addPlayerToken({ ...key, tokenHash: 'hash-a' });
    expect(store.findPlayerByTokenHash('hash-a')).toEqual(key);
    store.removePlayerTokens(key);
    expect(store.findPlayerByTokenHash('hash-a')).toBeUndefined();
  });

  it('keeps all of a transaction or none of it', () => {
    const store = newStore();
    expect(
      store.inTransaction(
        () => store.insert(emptyLobby(MONDAY_MORNING)).version,
      ),
    ).toBe(1);
    expect(() =>
      store.inTransaction(() => {
        store.insert(otherLobby());
        throw new Error('half way');
      }),
    ).toThrow('half way');
    expect(store.find('match-2')).toBeUndefined();
  });

  it('closes its database when the app shuts down', () => {
    const database = new DatabaseSync(':memory:');
    new SqliteMatchStore(database).onModuleDestroy();
    expect(database.isOpen).toBe(false);
  });
});
