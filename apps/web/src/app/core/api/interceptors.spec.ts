import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ApiError, MatchCreated } from '@lunch-campaign/contracts';
import { firstValueFrom } from 'rxjs';
import { session } from '../../../testing/match-fixtures';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { Snackbar } from '../notifications/snackbar';
import { PlayerSessions } from '../sessions/player-sessions';
import { apiErrorOf } from './api-error-interceptor';
import { InlineErrors } from './inline-errors';
import { LunchApi } from './lunch-api';

const NOT_FOUND: ApiError = {
  statusCode: 404,
  code: 'match.notFound',
  message: 'no',
  problems: [],
};
const FULL: ApiError = {
  statusCode: 409,
  code: 'lobby.full',
  message: 'full',
  problems: [],
};
const BROKEN: ApiError = {
  statusCode: 500,
  code: 'internal',
  message: 'oops',
  problems: [],
};

function httpError(body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ error: body, status: 502 });
}

/** A request with no form behind it, like the match resource's GET. */
@Injectable({ providedIn: 'root' })
class HttpClientHolder {
  private readonly http = inject(HttpClient);

  public get(url: string): ReturnType<HttpClient['get']> {
    return this.http.get(url);
  }
}

describe('the HTTP interceptors', () => {
  it('send the match’s player token, and nothing for calls outside a match', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const api = TestBed.inject(LunchApi);
    const ready = firstValueFrom(api.setReady('match-1', { ready: true }));
    const create = firstValueFrom(
      api.createMatch({ timeZone: 'Europe/Tallinn' }),
    );
    const readyRequest = httpTesting().expectOne('/api/matches/match-1/ready');
    const createRequest = httpTesting().expectOne('/api/matches');
    expect(readyRequest.request.headers.get('Authorization')).toBe(
      'Bearer token-a',
    );
    expect(createRequest.request.headers.has('Authorization')).toBe(false);
    readyRequest.flush(null);
    createRequest.flush({
      matchId: 'match-1',
      inviteCode: 'x',
    } satisfies MatchCreated);
    await Promise.all([ready, create]);
  });

  it('send no token for a match this device is not in', async () => {
    setUpWebTest();
    const done = firstValueFrom(
      TestBed.inject(LunchApi).setReady('match-9', { ready: true }),
    );
    const request = httpTesting().expectOne('/api/matches/match-9/ready');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(null);
    await done;
  });

  it('show a refusal inline in the form that asked, as a warning', async () => {
    const { sink } = setUpWebTest();
    const failed = firstValueFrom(
      TestBed.inject(LunchApi).join('invite-1', { name: 'Ana' }),
    );
    httpTesting()
      .expectOne('/api/invites/invite-1/players')
      .flush(FULL, { status: 409, statusText: 'Conflict' });
    await expect(failed).rejects.toMatchObject({ status: 409 });
    expect(TestBed.inject(InlineErrors).for('join')()).toEqual(FULL);
    expect(TestBed.inject(Snackbar).message()).toBeNull();
    expect(sink.reports).toEqual([
      { error: expect.anything(), severity: 'warning' },
    ]);
  });

  it('clear a form’s refusal when it asks again', async () => {
    setUpWebTest();
    const errors = TestBed.inject(InlineErrors);
    errors.set('join', FULL);
    const done = firstValueFrom(
      TestBed.inject(LunchApi).join('invite-1', { name: 'Ana' }),
    );
    expect(errors.for('join')()).toBeNull();
    httpTesting()
      .expectOne('/api/invites/invite-1/players')
      .flush({ matchId: 'm', playerId: 'p', playerToken: 't' });
    await done;
  });

  it('put a refusal with no form to show it in a snackbar', async () => {
    setUpWebTest();
    const failed = firstValueFrom(
      TestBed.inject(HttpClientHolder).get('/api/matches/match-1'),
    );
    httpTesting()
      .expectOne('/api/matches/match-1')
      .flush(NOT_FOUND, { status: 404, statusText: 'Not Found' });
    await expect(failed).rejects.toBeDefined();
    expect(TestBed.inject(Snackbar).message()).toMatchObject({
      text: 'That match does not exist.',
    });
  });

  it('put server failures in a snackbar, as errors', async () => {
    const { sink } = setUpWebTest();
    const failed = firstValueFrom(
      TestBed.inject(LunchApi).spy('match-1', { zoneId: 'B2' }),
    );
    httpTesting()
      .expectOne('/api/matches/match-1/spies')
      .flush(BROKEN, { status: 500, statusText: 'Server Error' });
    await expect(failed).rejects.toBeDefined();
    expect(TestBed.inject(InlineErrors).for('spy')()).toBeNull();
    expect(TestBed.inject(Snackbar).message()).toMatchObject({
      text: 'Something went wrong on our side. It has been reported.',
    });
    expect(sink.reports).toEqual([
      { error: expect.anything(), severity: 'error' },
    ]);
  });

  it('say the server cannot be reached when no answer came', async () => {
    setUpWebTest();
    const failed = firstValueFrom(TestBed.inject(LunchApi).leave('match-1'));
    httpTesting()
      .expectOne('/api/matches/match-1/players/me')
      .error(new ProgressEvent('error'));
    await expect(failed).rejects.toBeDefined();
    expect(TestBed.inject(Snackbar).message()).toMatchObject({
      text: 'Cannot reach the server. Check your connection and try again.',
    });
  });
});

describe('apiErrorOf', () => {
  it.each([
    { what: 'a plain error', error: new Error('x') },
    {
      what: 'a body that is not an API error',
      error: httpError({ message: 'proxy page' }),
    },
    {
      what: 'an API error body without a status',
      error: httpError({ code: 'internal' }),
    },
    { what: 'a text body', error: httpError('Bad Gateway') },
  ])('finds no API error in $what', ({ error }) => {
    expect(apiErrorOf(error)).toBeNull();
  });

  it('finds the API error in an HTTP error response', () => {
    expect(apiErrorOf(httpError(FULL))).toEqual(FULL);
  });
});
