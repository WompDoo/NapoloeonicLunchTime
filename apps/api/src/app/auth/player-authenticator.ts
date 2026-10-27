import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { domainError } from '../errors/domain-error';
import type { MatchStore, PlayerKey } from '../persistence/match-store';
import { MATCH_STORE } from '../persistence/match-store';

const BEARER = /^Bearer (\S+)$/;

/** Tokens are kept only as SHA-256 hashes: a leaked database never hands out anyone's view. */
export function hashPlayerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Turns the Authorization header into the player it belongs to, for the match in the URL. A player token
 * is the only credential: v0 has no accounts, only invite links.
 */
@Injectable()
export class PlayerAuthenticator {
  public constructor(
    @Inject(MATCH_STORE) private readonly store: MatchStore,
  ) {}

  public authenticate(
    authorization: string | undefined,
    matchId: string,
  ): PlayerKey {
    const player = this.playerOf(bearerToken(authorization));
    if (player.matchId !== matchId) {
      throw domainError(
        'auth.wrongMatch',
        'This player token belongs to another match',
      );
    }
    return player;
  }

  private playerOf(token: string): PlayerKey {
    const player = this.store.findPlayerByTokenHash(hashPlayerToken(token));
    if (player === undefined) {
      throw domainError('auth.unknownToken', 'Unknown player token');
    }
    return player;
  }
}

function bearerToken(authorization: string | undefined): string {
  const match = BEARER.exec(String(authorization));
  if (match === null) {
    throw domainError(
      'auth.missingToken',
      'Send your player token as "Authorization: Bearer <token>"',
    );
  }
  return match.slice(1).join('');
}
