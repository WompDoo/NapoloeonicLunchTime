import { HttpClient, HttpContext } from '@angular/common/http';
import type { HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateMatchRequest,
  JoinMatchRequest,
  MatchCreated,
  MatchDto,
  PickCommanderRequest,
  PlayerJoined,
  PreviewRequest,
  ReadyRequest,
  SpyReport,
  SpyRequest,
  SubmitOrdersRequest,
} from '@lunch-campaign/contracts';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import type { ErrorScope } from './inline-errors';
import { ERROR_SCOPE } from './inline-errors';

/** Every API call the app makes. Each names the form that shows its refusals inline. */
@Injectable({ providedIn: 'root' })
export class LunchApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  public matchUrl(matchId: string): string {
    return `${this.baseUrl}/matches/${matchId}`;
  }

  public createMatch(request: CreateMatchRequest): Observable<MatchCreated> {
    return this.http.post<MatchCreated>(
      `${this.baseUrl}/matches`,
      request,
      scoped('createMatch'),
    );
  }

  public join(
    inviteCode: string,
    request: JoinMatchRequest,
  ): Observable<PlayerJoined> {
    return this.http.post<PlayerJoined>(
      `${this.baseUrl}/invites/${encodeURIComponent(inviteCode)}/players`,
      request,
      scoped('join'),
    );
  }

  public pickCommander(
    matchId: string,
    request: PickCommanderRequest,
  ): Observable<MatchDto> {
    return this.http.put<MatchDto>(
      `${this.matchUrl(matchId)}/commander`,
      request,
      scoped('lobby'),
    );
  }

  public setReady(
    matchId: string,
    request: ReadyRequest,
  ): Observable<MatchDto> {
    return this.http.put<MatchDto>(
      `${this.matchUrl(matchId)}/ready`,
      request,
      scoped('lobby'),
    );
  }

  public leave(matchId: string): Observable<null> {
    return this.http.delete<null>(
      `${this.matchUrl(matchId)}/players/me`,
      scoped('lobby'),
    );
  }

  public submitOrders(
    matchId: string,
    request: SubmitOrdersRequest,
  ): Observable<MatchDto> {
    return this.http.put<MatchDto>(
      `${this.matchUrl(matchId)}/orders`,
      request,
      scoped('orders'),
    );
  }

  public spy(matchId: string, request: SpyRequest): Observable<SpyReport> {
    return this.http.post<SpyReport>(
      `${this.matchUrl(matchId)}/spies`,
      request,
      scoped('spy'),
    );
  }

  /** For an httpResource: the preview follows the plan as the player edits it. */
  public previewRequest(
    matchId: string,
    request: PreviewRequest,
  ): HttpResourceRequest {
    return {
      url: `${this.matchUrl(matchId)}/preview`,
      method: 'POST',
      body: request,
      ...scoped('preview'),
    };
  }
}

function scoped(scope: ErrorScope): { readonly context: HttpContext } {
  return { context: new HttpContext().set(ERROR_SCOPE, scope) };
}
