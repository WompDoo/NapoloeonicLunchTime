import type { Route } from '@angular/router';
import { requirePresent } from '@lunch-campaign/engine';
import { appRoutes } from './app.routes';
import { HomePage } from './features/home/home-page';
import { JoinPage } from './features/join/join-page';
import { MatchPage } from './features/match/match-page';

function routeTo(path: string): Route {
  return requirePresent(
    appRoutes.find((route) => route.path === path),
    `route ${path}`,
  );
}

describe('appRoutes', () => {
  it.each([
    { path: '', page: HomePage },
    { path: 'join/:inviteCode', page: JoinPage },
    { path: 'matches/:matchId', page: MatchPage },
  ])('loads the page for "$path" lazily', async ({ path, page }) => {
    const load = requirePresent(
      routeTo(path).loadComponent,
      `loader of ${path}`,
    );
    expect(await load()).toBe(page);
  });

  it('sends unknown paths home', () => {
    expect(routeTo('**').redirectTo).toBe('');
  });
});
