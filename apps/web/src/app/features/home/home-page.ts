import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { MatchCreated } from '@lunch-campaign/contracts';
import { createAction } from '../../core/api/action';
import { InlineErrors } from '../../core/api/inline-errors';
import { LunchApi } from '../../core/api/lunch-api';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { StatePanel } from '../../shared/state-panel';
import { errorKeyOf } from '../../shared/error-key';
import type { Observable } from 'rxjs';

/** Every time zone the browser knows, the viewer's own first. */
export function timeZoneChoices(
  own: string,
  known: readonly string[],
): readonly [string, ...string[]] {
  return [own, ...known.filter((zone): boolean => zone !== own)];
}

@Component({
  selector: 'lc-home-page',
  imports: [FormsModule, RouterLink, StatePanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly api = inject(LunchApi);
  private readonly router = inject(Router);
  protected readonly sessions = inject(PlayerSessions).all;
  protected readonly createError = inject(InlineErrors).for('createMatch');
  protected readonly errorKeyOf = errorKeyOf;

  protected readonly timeZones = timeZoneChoices(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    Intl.supportedValuesOf('timeZone'),
  );
  protected readonly timeZone = signal(this.timeZones[0]);
  protected readonly create = createAction(
    (timeZone: string): Observable<MatchCreated> =>
      this.api.createMatch({ timeZone }),
  );

  protected async createMatch(): Promise<void> {
    const created = await this.create.run(this.timeZone());
    await this.openInvite(created);
  }

  private async openInvite(created: MatchCreated | null): Promise<void> {
    if (created !== null) {
      await this.router.navigate(['/join', created.inviteCode]);
    }
  }
}
