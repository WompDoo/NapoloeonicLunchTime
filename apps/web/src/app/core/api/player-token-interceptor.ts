import type { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PlayerSessions } from '../sessions/player-sessions';
import { matchIdInUrl } from './api-base-url';
import type { Observable } from 'rxjs';

/** Requests about a match carry this device's player token for it, when it has one. */
export const playerTokenInterceptor: HttpInterceptorFn = (
  request,
  next,
): Observable<HttpEvent<unknown>> => {
  const token = tokenFor(inject(PlayerSessions), request.url);
  return next(
    token === null
      ? request
      : request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};

function tokenFor(sessions: PlayerSessions, url: string): string | null {
  const matchId = matchIdInUrl(url);
  return matchId === null ? null : sessions.tokenFor(matchId);
}
