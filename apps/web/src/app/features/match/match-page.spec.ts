import { requirePresent } from '@lunch-campaign/engine';
import { TestBed } from '@angular/core/testing';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { buttonNamed, textOf } from '../../../testing/dom';
import {
  lobby,
  MATCH_ID,
  session,
  weekMatch,
} from '../../../testing/match-fixtures';
import { render, renderPending } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { MatchPage, REFRESH_INTERVAL_MS } from './match-page';

const MATCH_URL = `/api/matches/${MATCH_ID}`;

describe('MatchPage', () => {
  it('sends a device that is not in the match back to its invite', async () => {
    setUpWebTest();
    const fixture = await render(MatchPage, { matchId: MATCH_ID });
    expect(textOf(fixture)).toContain('This device is not in that match.');
    httpTesting().expectNone(MATCH_URL);
  });

  it('loads the match, then shows the lobby', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const fixture = renderPending(MatchPage, { matchId: MATCH_ID });
    expect(textOf(fixture)).toContain('Loading…');
    httpTesting().expectOne(MATCH_URL).flush(lobby());
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Lobby');
  });

  it('shows a started match', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const fixture = renderPending(MatchPage, { matchId: MATCH_ID });
    httpTesting().expectOne(MATCH_URL).flush(weekMatch(0));
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Day 1: Monday');
  });

  it('offers a retry when the match cannot be loaded', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const fixture = renderPending(MatchPage, { matchId: MATCH_ID });
    httpTesting().expectOne(MATCH_URL).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('This could not be loaded.');
    buttonNamed(fixture, 'Try again').click();
    fixture.detectChanges();
    httpTesting().expectOne(MATCH_URL).flush(lobby());
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Lobby');
  });

  it('shows what an action answered without asking again', async () => {
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const fixture = renderPending(MatchPage, { matchId: MATCH_ID });
    httpTesting()
      .expectOne(MATCH_URL)
      .flush(lobby({ yourCommanderId: 'napoleon' }));
    await fixture.whenStable();
    buttonNamed(fixture, "I'm ready").click();
    httpTesting().expectOne(`${MATCH_URL}/ready`).flush(weekMatch(0));
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Day 1: Monday');
    httpTesting().expectNone(MATCH_URL);
  });

  it('looks for news every minute and when the window gets focus, until it is gone', async () => {
    const intervals = jest.spyOn(window, 'setInterval');
    const cleared = jest.spyOn(window, 'clearInterval');
    setUpWebTest();
    TestBed.inject(PlayerSessions).save(session());
    const fixture = renderPending(MatchPage, { matchId: MATCH_ID });
    httpTesting().expectOne(MATCH_URL).flush(lobby());
    await fixture.whenStable();
    const [tick, interval] = requirePresent(
      intervals.mock.calls.at(-1),
      'the refresh interval',
    );
    expect(interval).toBe(REFRESH_INTERVAL_MS);
    (tick as () => void)();
    TestBed.tick();
    httpTesting().expectOne(MATCH_URL).flush(lobby());
    await fixture.whenStable();
    window.dispatchEvent(new Event('focus'));
    TestBed.tick();
    httpTesting().expectOne(MATCH_URL).flush(lobby());
    await fixture.whenStable();
    fixture.destroy();
    expect(cleared).toHaveBeenCalledWith(
      requirePresent(intervals.mock.results.at(-1), 'the timer').value,
    );
  });
});
