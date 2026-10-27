import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { HonourAward, MatchScore } from '@lunch-campaign/contracts';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { honourName } from '../../shared/content-keys';
import type { Roster } from '../../shared/roster';

/** More than one winner is a shared victory. */
const SOLE_WINNER = 1;

/** The week's result: the winner, every player's points by source, and who earned each honour. */
@Component({
  selector: 'lc-final-score-board',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './final-score-board.html',
  styleUrl: './final-score-board.scss',
})
export class FinalScoreBoard {
  public readonly score = input.required<MatchScore>();
  public readonly roster = input.required<Roster>();
  protected readonly honourName = honourName;

  protected readonly winners = computed((): string =>
    this.names(this.score().winnerIds),
  );
  protected readonly verdictKey = computed(
    (): TranslationKey =>
      this.score().winnerIds.length > SOLE_WINNER
        ? 'final.shared'
        : 'final.winner',
  );

  protected awardees(award: HonourAward): string {
    return this.names(award.winnerIds);
  }

  private names(playerIds: readonly string[]): string {
    return playerIds
      .map((playerId): string => this.roster().nameOf(playerId))
      .join(', ');
  }
}
