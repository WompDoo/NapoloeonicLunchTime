import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MatchDto } from '@lunch-campaign/contracts';
import { LunchApi } from '../../core/api/lunch-api';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { StatePanel } from '../../shared/state-panel';
import { LobbyPanel } from '../lobby/lobby-panel';
import { PlayingView } from '../playing/playing-view';
import type { PlayerSession } from '../../core/sessions/player-sessions';

/** How often an open match looks for the night's results and others' lobby changes. */
export const REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'lc-match-page',
  imports: [LobbyPanel, PlayingView, RouterLink, StatePanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:focus)': 'refresh()' },
  templateUrl: './match-page.html',
})
export class MatchPage {
  private readonly api = inject(LunchApi);
  private readonly sessions = inject(PlayerSessions);

  public readonly matchId = input.required<string>();
  protected readonly session = computed((): PlayerSession | null =>
    this.sessions.sessionFor(this.matchId()),
  );
  protected readonly match = httpResource<MatchDto>((): string | undefined =>
    this.session() === null ? undefined : this.api.matchUrl(this.matchId()),
  );

  public constructor() {
    const timer = setInterval((): void => {
      this.refresh();
    }, REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy((): void => {
      clearInterval(timer);
    });
  }

  protected refresh(): void {
    this.match.reload();
  }

  /** Actions answer with the new match: show it at once, without another request. */
  protected show(match: MatchDto): void {
    this.match.set(match);
  }
}
