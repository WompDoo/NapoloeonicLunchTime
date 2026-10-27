import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { PlayerJoined } from '@lunch-campaign/contracts';
import { createAction } from '../../core/api/action';
import { InlineErrors } from '../../core/api/inline-errors';
import { LunchApi } from '../../core/api/lunch-api';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import { errorKeyOf } from '../../shared/error-key';
import type { Observable } from 'rxjs';

@Component({
  selector: 'lc-join-page',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
})
export class JoinPage {
  private readonly api = inject(LunchApi);
  private readonly router = inject(Router);
  private readonly sessions = inject(PlayerSessions);
  protected readonly joinError = inject(InlineErrors).for('join');
  protected readonly errorKeyOf = errorKeyOf;

  public readonly inviteCode = input.required<string>();
  protected readonly name = signal('');
  protected readonly join = createAction(
    (name: string): Observable<PlayerJoined> =>
      this.api.join(this.inviteCode(), { name }),
  );

  protected async submit(): Promise<void> {
    const joined = await this.join.run(this.name().trim());
    await this.enter(joined);
  }

  private async enter(joined: PlayerJoined | null): Promise<void> {
    if (joined !== null) {
      this.sessions.save({ ...joined, name: this.name().trim() });
      await this.router.navigate(['/matches', joined.matchId]);
    }
  }
}
