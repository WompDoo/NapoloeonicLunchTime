import { toPlayerId } from '@lunch-campaign/engine';
import { DatabaseSync } from 'node:sqlite';
import { FakeClock } from '../../testing/fake-clock';
import { MONDAY_MORNING, SETTINGS } from '../../testing/match-fixtures';
import { countingRandom } from '../../testing/scripted-random';
import type { DomainError } from '../errors/domain-error';
import { SqliteMatchStore } from '../persistence/sqlite-match-store';
import { MatchesService } from './matches.service';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as DomainError).code;
  }
  throw new Error('Expected a domain error');
}

describe('MatchesService', () => {
  it('refuses a player key for a match that does not exist', () => {
    const service = new MatchesService(
      new SqliteMatchStore(new DatabaseSync(':memory:')),
      new FakeClock(MONDAY_MORNING),
      countingRandom(),
      SETTINGS,
    );
    expect(
      codeOf(() =>
        service.view({ matchId: 'nowhere', playerId: toPlayerId('player-a') }),
      ),
    ).toBe('match.notFound');
  });
});
