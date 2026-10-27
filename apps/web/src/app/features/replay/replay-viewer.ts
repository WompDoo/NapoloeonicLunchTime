import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import type { PlayerView } from '@lunch-campaign/contracts';
import { LOCALE, Translator } from '../../core/i18n/translator';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { Roster } from '../../shared/roster';
import { StatePanel } from '../../shared/state-panel';
import { CampaignMap } from '../map/campaign-map';
import type { Narration } from './narrate-event';
import { narrateNight } from './narrate-event';

const STRENGTH_DIGITS = 1;

/** Last night as a story: step through it with the map showing where each thing happened, or read it all. */
@Component({
  selector: 'lc-replay-viewer',
  imports: [CampaignMap, StatePanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './replay-viewer.html',
  styleUrl: './replay-viewer.scss',
})
export class ReplayViewer {
  private readonly translator = inject(Translator);
  private readonly numbers = new Intl.NumberFormat(inject(LOCALE), {
    maximumFractionDigits: STRENGTH_DIGITS,
  });

  public readonly view = input.required<PlayerView>();
  public readonly roster = input.required<Roster>();

  protected readonly narrations = computed((): readonly Narration[] =>
    narrateNight(this.view().lastNight, {
      translator: this.translator,
      roster: this.roster(),
      formatStrength: (strength): string => this.numbers.format(strength),
    }),
  );
  private readonly night = computed((): number => this.view().turnNumber);
  /** Back to the first step when a new night arrives, not on every refresh of the same one. */
  protected readonly step = linkedSignal<number, number>({
    source: this.night,
    computation: (): number => 0,
  });
  protected readonly showAll = signal(false);
  protected readonly current = computed(
    (): Narration | null => this.narrations()[this.step()] ?? null,
  );

  protected previous(): void {
    this.step.update((step): number => Math.max(step - 1, 0));
  }

  protected next(): void {
    this.step.update((step): number =>
      Math.min(step + 1, this.narrations().length - 1),
    );
  }

  protected toggleAll(): void {
    this.showAll.update((showAll): boolean => !showAll);
  }
}
