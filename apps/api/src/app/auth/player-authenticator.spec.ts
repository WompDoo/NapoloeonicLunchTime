import { toPlayerId } from '@lunch-campaign/engine';
import { DatabaseSync } from 'node:sqlite';
import { emptyLobby, MONDAY_MORNING } from '../../testing/match-fixtures';
import type { DomainError } from '../errors/domain-error';
import { SqliteMatchStore } from '../persistence/sqlite-match-store';
import { hashPlayerToken, PlayerAuthenticator } from './player-authenticator';

const PLAYER = { matchId: 'match-1', playerId: toPlayerId('player-a') };

function authenticator(): PlayerAuthenticator {
  const store = new SqliteMatchStore(new DatabaseSync(':memory:'));
  store.insert(emptyLobby(MONDAY_MORNING));
  store.addPlayerToken({ ...PLAYER, tokenHash: hashPlayerToken('token-a') });
  return new PlayerAuthenticator(store);
}

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as DomainError).code;
  }
  throw new Error('Expected a domain error');
}

describe('PlayerAuthenticator', () => {
  it('finds the player behind a bearer token', () => {
    expect(authenticator().authenticate('Bearer token-a', 'match-1')).toEqual(
      PLAYER,
    );
  });

  it.each([
    { name: 'no header', header: undefined, code: 'auth.missingToken' },
    {
      name: 'another scheme',
      header: 'Basic token-a',
      code: 'auth.missingToken',
    },
    {
      name: 'an unknown token',
      header: 'Bearer token-z',
      code: 'auth.unknownToken',
    },
  ])('refuses $name', ({ header, code }) => {
    expect(codeOf(() => authenticator().authenticate(header, 'match-1'))).toBe(
      code,
    );
  });

  it("refuses a token for another match's URL", () => {
    expect(
      codeOf(() => authenticator().authenticate('Bearer token-a', 'match-2')),
    ).toBe('auth.wrongMatch');
  });

  it('stores tokens as SHA-256 hashes', () => {
    expect(hashPlayerToken('token-a')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPlayerToken('token-a')).not.toBe(hashPlayerToken('token-b'));
  });
});
