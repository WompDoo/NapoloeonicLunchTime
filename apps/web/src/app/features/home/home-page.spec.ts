import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { ApiError, MatchCreated } from '@lunch-campaign/contracts';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { buttonNamed, choose, query, textOf } from '../../../testing/dom';
import { session } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { HomePage, timeZoneChoices } from './home-page';

describe('timeZoneChoices', () => {
  it('puts your own time zone first, once', () => {
    expect(
      timeZoneChoices('Europe/Tallinn', [
        'Africa/Abidjan',
        'Europe/Tallinn',
        'UTC',
      ]),
    ).toEqual(['Europe/Tallinn', 'Africa/Abidjan', 'UTC']);
  });
});

describe('HomePage', () => {
  it('says there are no matches on a new device', async () => {
    setUpWebTest();
    const fixture = await render(HomePage);
    expect(textOf(fixture)).toContain('No matches on this device yet.');
  });

  it('lists the matches this device has joined', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session({ name: 'Ana' }));
    const fixture = await render(HomePage);
    expect(textOf(fixture)).toContain('as Ana');
    expect(
      query<HTMLAnchorElement>(fixture, 'a.campaign__link').getAttribute(
        'href',
      ),
    ).toBe('/matches/match-1');
  });

  it('creates a match in the chosen time zone and opens its invite', async () => {
    setUpWebTest();
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const fixture = await render(HomePage);
    choose(query<HTMLSelectElement>(fixture, '#time-zone'), 'UTC');
    await fixture.whenStable();
    buttonNamed(fixture, 'Create the lobby').click();
    const request = httpTesting().expectOne('/api/matches');
    expect(request.request.body).toEqual({ timeZone: 'UTC' });
    request.flush({
      matchId: 'match-1',
      inviteCode: 'invite-1',
    } satisfies MatchCreated);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/join', 'invite-1']);
  });

  it('shows a refusal next to the time zone', async () => {
    setUpWebTest();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate');
    const fixture = await render(HomePage);
    buttonNamed(fixture, 'Create the lobby').click();
    httpTesting()
      .expectOne('/api/matches')
      .flush(
        {
          statusCode: 400,
          code: 'lobby.unknownTimeZone',
          message: '',
          problems: [],
        } satisfies ApiError,
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();
    expect(query(fixture, '#create-error').textContent).toContain(
      'That time zone is not known.',
    );
    expect(query(fixture, '#time-zone').getAttribute('aria-describedby')).toBe(
      'create-error',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
