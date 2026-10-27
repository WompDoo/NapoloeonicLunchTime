import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { ApiError, MatchDto } from '@lunch-campaign/contracts';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { buttonNamed, query, queryAll, textOf } from '../../../testing/dom';
import {
  FRIEND,
  lobby,
  MATCH_ID,
  member,
  session,
  YOU,
} from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { inviteLinkOf, LobbyPanel } from './lobby-panel';

describe('inviteLinkOf', () => {
  it('links to this app’s join page for the code', () => {
    expect(inviteLinkOf('https://lunch.example', 'a/b')).toBe(
      'https://lunch.example/join/a%2Fb',
    );
  });
});

describe('LobbyPanel', () => {
  async function renderLobby(dto = lobby()): Promise<{
    fixture: Awaited<ReturnType<typeof render<LobbyPanel>>>;
    changes: MatchDto[];
  }> {
    const fixture = await render(LobbyPanel, { lobby: dto });
    const changes: MatchDto[] = [];
    fixture.componentInstance.changed.subscribe((match) => changes.push(match));
    return { fixture, changes };
  }

  it('shows the invite link and copies it', async () => {
    const { clipboard } = setUpWebTest();
    const { fixture } = await renderLobby();
    const link = query<HTMLInputElement>(fixture, '.lobby__link').value;
    expect(link).toBe('http://localhost/join/invite-1');
    buttonNamed(fixture, 'Copy').click();
    await fixture.whenStable();
    expect(clipboard.copied).toBe(link);
    expect(buttonNamed(fixture, 'Copied')).toBeDefined();
  });

  it('keeps saying Copy when copying fails', async () => {
    const { clipboard } = setUpWebTest();
    clipboard.refusing = true;
    const { fixture } = await renderLobby();
    buttonNamed(fixture, 'Copy').click();
    await fixture.whenStable();
    expect(buttonNamed(fixture, 'Copy')).toBeDefined();
  });

  it('shows who is in, whether they picked and are ready, but never their pick', async () => {
    setUpWebTest();
    const { fixture } = await renderLobby(
      lobby({
        members: [
          member(YOU),
          member(FRIEND, { hasPicked: true, ready: true }),
        ],
      }),
    );
    const members = queryAll(fixture, '.member').map((element) =>
      element.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(members).toEqual([
      'Ana (you) No commander yet · Not ready',
      'Bo Commander picked · Ready',
    ]);
    expect(textOf(fixture)).toContain('2 players · 2 to 4 players');
  });

  it('picks a commander, then gets ready, showing what the API answers', async () => {
    setUpWebTest();
    const { fixture, changes } = await renderLobby();
    expect(buttonNamed(fixture, "I'm ready").disabled).toBe(true);
    query<HTMLInputElement>(fixture, 'input[value=murat]').dispatchEvent(
      new Event('change'),
    );
    const pick = httpTesting().expectOne(`/api/matches/${MATCH_ID}/commander`);
    expect(pick.request.body).toEqual({ commanderId: 'murat' });
    pick.flush(lobby({ yourCommanderId: 'murat' }));
    await fixture.whenStable();
    fixture.componentRef.setInput('lobby', changes[0]);
    await fixture.whenStable();
    expect(query<HTMLInputElement>(fixture, 'input[value=murat]').checked).toBe(
      true,
    );
    buttonNamed(fixture, "I'm ready").click();
    const ready = httpTesting().expectOne(`/api/matches/${MATCH_ID}/ready`);
    expect(ready.request.body).toEqual({ ready: true });
    ready.flush(lobby());
    await fixture.whenStable();
    expect(changes).toHaveLength(2);
  });

  it('lets a ready player take it back', async () => {
    setUpWebTest();
    const { fixture } = await renderLobby(
      lobby({
        yourCommanderId: 'murat',
        members: [
          member(YOU, { hasPicked: true, ready: true }),
          member(FRIEND),
        ],
      }),
    );
    buttonNamed(fixture, 'Not ready yet').click();
    const request = httpTesting().expectOne(`/api/matches/${MATCH_ID}/ready`);
    expect(request.request.body).toEqual({ ready: false });
    request.flush(lobby());
    await fixture.whenStable();
  });

  it('shows a refusal and changes nothing', async () => {
    setUpWebTest();
    const { fixture, changes } = await renderLobby(
      lobby({ yourCommanderId: 'murat' }),
    );
    buttonNamed(fixture, "I'm ready").click();
    httpTesting()
      .expectOne(`/api/matches/${MATCH_ID}/ready`)
      .flush(
        {
          statusCode: 409,
          code: 'lobby.started',
          message: '',
          problems: [],
        } satisfies ApiError,
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(query(fixture, '[role=alert]').textContent).toContain(
      'This match has already started.',
    );
    expect(changes).toEqual([]);
  });

  it('leaves the lobby, forgets the match and goes home', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const { fixture } = await renderLobby();
    buttonNamed(fixture, 'Leave the lobby').click();
    httpTesting()
      .expectOne(`/api/matches/${MATCH_ID}/players/me`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(TestBed.inject(PlayerSessions).sessionFor(MATCH_ID)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('stays when leaving fails', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const { fixture } = await renderLobby();
    buttonNamed(fixture, 'Leave the lobby').click();
    httpTesting()
      .expectOne(`/api/matches/${MATCH_ID}/players/me`)
      .error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(TestBed.inject(PlayerSessions).sessionFor(MATCH_ID)).not.toBeNull();
  });
});
