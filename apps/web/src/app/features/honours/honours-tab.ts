import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { PlayerView } from '@lunch-campaign/contracts';
import type { Roster } from '../../shared/roster';
import { FinalScoreBoard } from './final-score-board';
import { HonoursBoard } from './honours-board';
import { PlayersList } from './players-list';
import type { MatchScore } from '@lunch-campaign/contracts';

/** The final score once the week is over, the commanders, and the race for each honour. */
@Component({
  selector: 'lc-honours-tab',
  imports: [FinalScoreBoard, HonoursBoard, PlayersList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4">
      @if (finalScore(); as score) {
        <lc-final-score-board [score]="score" [roster]="roster()" />
      }
      <div class="grid gap-4 lg:grid-cols-2">
        <lc-players-list [players]="view().players" [roster]="roster()" />
        <lc-honours-board [honours]="view().honours" [roster]="roster()" />
      </div>
    </div>
  `,
})
export class HonoursTab {
  public readonly view = input.required<PlayerView>();
  public readonly roster = input.required<Roster>();
  protected readonly finalScore = computed(
    (): MatchScore | null => this.view().finalScore,
  );
}
