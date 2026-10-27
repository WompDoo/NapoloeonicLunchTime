import type { Route } from '@angular/router';
import type { HomePage } from './features/home/home-page';
import type { JoinPage } from './features/join/join-page';
import type { MatchPage } from './features/match/match-page';

/** Every page loads lazily; the type-only imports above are erased, so they keep it that way. */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: (): Promise<typeof HomePage> =>
      import('./features/home/home-page').then(
        (page): typeof HomePage => page.HomePage,
      ),
  },
  {
    path: 'join/:inviteCode',
    loadComponent: (): Promise<typeof JoinPage> =>
      import('./features/join/join-page').then(
        (page): typeof JoinPage => page.JoinPage,
      ),
  },
  {
    path: 'matches/:matchId',
    loadComponent: (): Promise<typeof MatchPage> =>
      import('./features/match/match-page').then(
        (page): typeof MatchPage => page.MatchPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
