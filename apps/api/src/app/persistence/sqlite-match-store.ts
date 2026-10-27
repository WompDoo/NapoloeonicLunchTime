import type { OnModuleDestroy } from '@nestjs/common';
import {
  decodeNonEmptyString,
  decodePositiveInteger,
  toPlayerId,
} from '@lunch-campaign/engine';
import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import { domainError } from '../errors/domain-error';
import type { StoredMatch } from '../matches/stored-match';
import type {
  MatchStore,
  PlayerKey,
  PlayerTokenRecord,
  SavedMatch,
} from './match-store';

type Row = Record<string, SQLOutputValue>;

const FIRST_VERSION = 1;

const SCHEMA = `
  create table if not exists matches (
    match_id text primary key,
    invite_code text not null unique,
    version integer not null,
    next_resolution_at text,
    document text not null
  );
  create index if not exists matches_by_next_resolution on matches (next_resolution_at);
  create table if not exists player_tokens (
    token_hash text primary key,
    match_id text not null references matches (match_id),
    player_id text not null
  );
`;

/**
 * Matches as JSON documents in SQLite, with the columns queries need beside them. Node's built-in SQLite is
 * synchronous, so a request's read, change and write never interleave with another request's.
 */
export class SqliteMatchStore implements MatchStore, OnModuleDestroy {
  public constructor(private readonly database: DatabaseSync) {
    database.exec('pragma foreign_keys = on');
    database.exec(SCHEMA);
  }

  public readonly insert = (match: StoredMatch): SavedMatch => {
    this.database
      .prepare(
        'insert into matches (match_id, invite_code, version, next_resolution_at, document) values (?, ?, ?, null, ?)',
      )
      .run(
        match.matchId,
        match.inviteCode,
        FIRST_VERSION,
        JSON.stringify(match),
      );
    return { match, version: FIRST_VERSION };
  };

  public readonly update = (
    saved: SavedMatch,
    next: StoredMatch,
    nextResolutionAt: string | null,
  ): SavedMatch => {
    const result = this.database
      .prepare(
        'update matches set version = version + 1, next_resolution_at = ?, document = ? where match_id = ? and version = ?',
      )
      .run(
        nextResolutionAt,
        JSON.stringify(next),
        saved.match.matchId,
        saved.version,
      );
    if (result.changes === 0) {
      throw domainError(
        'match.conflict',
        `Match ${saved.match.matchId} changed since it was read`,
      );
    }
    return { match: next, version: saved.version + 1 };
  };

  public readonly find = (matchId: string): SavedMatch | undefined =>
    savedMatchOf(
      this.database
        .prepare('select version, document from matches where match_id = ?')
        .get(matchId),
    );

  public readonly findByInviteCode = (
    inviteCode: string,
  ): SavedMatch | undefined =>
    savedMatchOf(
      this.database
        .prepare('select version, document from matches where invite_code = ?')
        .get(inviteCode),
    );

  public readonly dueForResolution = (now: Date): readonly string[] =>
    this.database
      .prepare(
        'select match_id from matches where next_resolution_at <= ? order by next_resolution_at, match_id',
      )
      .all(now.toISOString())
      .map((row): string => decodeNonEmptyString(row['match_id'], 'match_id'));

  public readonly addPlayerToken = (token: PlayerTokenRecord): void => {
    this.database
      .prepare(
        'insert into player_tokens (token_hash, match_id, player_id) values (?, ?, ?)',
      )
      .run(token.tokenHash, token.matchId, token.playerId);
  };

  public readonly removePlayerTokens = (key: PlayerKey): void => {
    this.database
      .prepare('delete from player_tokens where match_id = ? and player_id = ?')
      .run(key.matchId, key.playerId);
  };

  public readonly findPlayerByTokenHash = (
    tokenHash: string,
  ): PlayerKey | undefined =>
    playerKeyOf(
      this.database
        .prepare(
          'select match_id, player_id from player_tokens where token_hash = ?',
        )
        .get(tokenHash),
    );

  public readonly inTransaction = <T>(work: () => T): T => {
    this.database.exec('begin immediate');
    try {
      const result = work();
      this.database.exec('commit');
      return result;
    } catch (error) {
      this.database.exec('rollback');
      throw error;
    }
  };

  public onModuleDestroy(): void {
    this.database.close();
  }
}

function savedMatchOf(row: Row | undefined): SavedMatch | undefined {
  return row === undefined
    ? undefined
    : {
        version: decodePositiveInteger(row['version'], 'version'),
        match: JSON.parse(
          decodeNonEmptyString(row['document'], 'document'),
        ) as StoredMatch,
      };
}

function playerKeyOf(row: Row | undefined): PlayerKey | undefined {
  return row === undefined
    ? undefined
    : {
        matchId: decodeNonEmptyString(row['match_id'], 'match_id'),
        playerId: toPlayerId(
          decodeNonEmptyString(row['player_id'], 'player_id'),
        ),
      };
}
