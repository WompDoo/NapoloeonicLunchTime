import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import type { CounterHint, MatchupPreview } from '@lunch-campaign/contracts';
import type { UnitType } from '@lunch-campaign/engine';
import { LOCALE } from '../../core/i18n/translator';
import { Translator } from '../../core/i18n/translator';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

/** Strengths are shown to one decimal: enough to compare, without false precision. */
const STRENGTH_DIGITS = 1;

/** What you could know about a planned fight. An estimate, never a promise. */
@Component({
  selector: 'lc-matchup-preview-card',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matchup-preview-card.html',
  styleUrl: './matchup-preview-card.scss',
})
export class MatchupPreviewCard {
  private readonly translator = inject(Translator);
  private readonly numbers = new Intl.NumberFormat(inject(LOCALE), {
    maximumFractionDigits: STRENGTH_DIGITS,
  });

  public readonly preview = input.required<MatchupPreview>();

  protected strength(value: number): string {
    return this.numbers.format(value);
  }

  protected unitName(unitType: UnitType): string {
    return this.translator.translate(`unitName.${unitType}`);
  }

  protected unitNames(unitTypes: readonly UnitType[]): string {
    return unitTypes
      .map((unitType): string => this.unitName(unitType))
      .join(', ');
  }

  protected hintsOf(preview: MatchupPreview): readonly CounterHint[] {
    return 'hints' in preview ? preview.hints : [];
  }
}
