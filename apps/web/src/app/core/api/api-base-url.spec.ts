import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, matchIdInUrl } from './api-base-url';

describe('matchIdInUrl', () => {
  it.each([
    { url: '/api/matches/match-1', matchId: 'match-1' },
    { url: '/api/matches/match-1/orders', matchId: 'match-1' },
    { url: '/api/invites/abc/players', matchId: null },
    { url: '/api/matches', matchId: null },
  ])('finds $matchId in $url', ({ url, matchId }) => {
    expect(matchIdInUrl(url)).toBe(matchId);
  });
});

describe('API_BASE_URL', () => {
  it('comes from the environment', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe('/api');
  });
});
