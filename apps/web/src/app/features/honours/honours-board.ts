import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { HonourStandingView } from '@lunch-campaign/contracts';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { honourDescription, honourName } from '../../shared/content-keys';
import type { Roster } from '../../shared/roster';
import { StatePanel } from '../../shared/state-panel';

/** The honours drawn for this match: who would earn each if the week ended now, and everyone's numbers. */
@Component({
  selector: 'lc-honours-board',
  imports: [StatePanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './honours-board.html',
  styleUrl: './honours-board.scss',
})
export class HonoursBoard {
  public readonly honours = input.required<readonly HonourStandingView[]>();
  public readonly roster = input.required<Roster>();
  protected readonly honourName = honourName;
  protected readonly honourDescription = honourDescription;

  protected leaders(honour: HonourStandingView): string {
    return honour.leaderIds
      .map((playerId): string => this.roster().nameOf(playerId))
      .join(', ');
  }
}
