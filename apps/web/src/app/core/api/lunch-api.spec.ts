import { TestBed } from '@angular/core/testing';
import type { MatchDto } from '@lunch-campaign/contracts';
import { NO_UNITS, toZoneId } from '@lunch-campaign/engine';
import { firstValueFrom } from 'rxjs';
import { lobby } from '../../../testing/match-fixtures';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { ERROR_SCOPE } from './inline-errors';
import { LunchApi } from './lunch-api';

describe('LunchApi', () => {
  it.each([
    {
      call: (api: LunchApi): Promise<unknown> =>
        firstValueFrom(api.pickCommander('match-1', { commanderId: 'murat' })),
      method: 'PUT',
      url: '/api/matches/match-1/commander',
      scope: 'lobby',
    },
    {
      call: (api: LunchApi): Promise<unknown> =>
        firstValueFrom(api.submitOrders('match-1', { orders: [] })),
      method: 'PUT',
      url: '/api/matches/match-1/orders',
      scope: 'orders',
    },
    {
      call: (api: LunchApi): Promise<unknown> =>
        firstValueFrom(api.createMatch({ timeZone: 'UTC' })),
      method: 'POST',
      url: '/api/matches',
      scope: 'createMatch',
    },
    {
      call: (api: LunchApi): Promise<unknown> =>
        firstValueFrom(api.join('a b', { name: 'Ana' })),
      method: 'POST',
      url: '/api/invites/a%20b/players',
      scope: 'join',
    },
  ])(
    '$method $url, refusals shown in the $scope form',
    async ({ call, method, url, scope }) => {
      setUpWebTest();
      const done = call(TestBed.inject(LunchApi));
      const request = httpTesting().expectOne(url);
      expect(request.request.method).toBe(method);
      expect(request.request.context.get(ERROR_SCOPE)).toBe(scope);
      request.flush(lobby() satisfies MatchDto);
      await done;
    },
  );

  it('describes a preview request for a resource', () => {
    setUpWebTest();
    const plan = { toZoneId: toZoneId('B2'), units: NO_UNITS };
    expect(
      TestBed.inject(LunchApi).previewRequest('match-1', plan),
    ).toMatchObject({
      url: '/api/matches/match-1/preview',
      method: 'POST',
      body: plan,
    });
  });
});
