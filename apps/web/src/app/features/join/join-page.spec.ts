import { toPlayerId } from '@lunch-campaign/engine';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { ApiError, PlayerJoined } from '@lunch-campaign/contracts';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { buttonNamed, enter, query } from '../../../testing/dom';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { JoinPage } from './join-page';

describe('JoinPage', () => {
  it('joins under the name given, keeps the seat on this device and opens the match', async () => {
    setUpWebTest();
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const fixture = await render(JoinPage, { inviteCode: 'invite-1' });
    expect(buttonNamed(fixture, 'Join').disabled).toBe(true);
    enter(query<HTMLInputElement>(fixture, '#player-name'), '  Ana  ');
    await fixture.whenStable();
    buttonNamed(fixture, 'Join').click();
    const request = httpTesting().expectOne('/api/invites/invite-1/players');
    expect(request.request.body).toEqual({ name: 'Ana' });
    request.flush({
      matchId: 'match-1',
      playerId: toPlayerId('player-a'),
      playerToken: 'token-a',
    } satisfies PlayerJoined);
    await fixture.whenStable();
    expect(TestBed.inject(PlayerSessions).sessionFor('match-1')).toEqual({
      matchId: 'match-1',
      playerId: 'player-a',
      playerToken: 'token-a',
      name: 'Ana',
    });
    expect(navigate).toHaveBeenCalledWith(['/matches', 'match-1']);
  });

  it('shows a refusal on the name field', async () => {
    setUpWebTest();
    const fixture = await render(JoinPage, { inviteCode: 'gone' });
    enter(query<HTMLInputElement>(fixture, '#player-name'), 'Ana');
    await fixture.whenStable();
    buttonNamed(fixture, 'Join').click();
    httpTesting()
      .expectOne('/api/invites/gone/players')
      .flush(
        {
          statusCode: 404,
          code: 'lobby.unknownInvite',
          message: '',
          problems: [],
        } satisfies ApiError,
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();
    expect(query(fixture, '#join-error').textContent).toContain(
      'This invite link is not valid.',
    );
    expect(query(fixture, '#player-name').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(TestBed.inject(PlayerSessions).all()).toEqual([]);
  });
});
