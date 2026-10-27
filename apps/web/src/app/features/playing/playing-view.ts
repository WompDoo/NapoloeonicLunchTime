import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import type { MatchDto, PlayingMatchDto } from '@lunch-campaign/contracts';
import type { ZoneId } from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { HonoursTab } from '../honours/honours-tab';
import { MapTab } from '../map/map-tab';
import { OrdersPanel } from '../orders/orders-panel';
import { ReplayViewer } from '../replay/replay-viewer';
import { DayHeader } from './day-header';
import { dayPhaseOf } from './day-status';
import type { MatchTab } from './match-tabs';
import { MATCH_TABS, OPENING_TAB, TAB_LABELS, tabAfterKey } from './match-tabs';
import type { Roster } from '../../shared/roster';
import type { DayPhase } from './day-status';

/** A started match: today's header and four tabs. The selected zone is shared by the map and the orders. */
@Component({
  selector: 'lc-playing-view',
  imports: [
    DayHeader,
    HonoursTab,
    MapTab,
    OrdersPanel,
    ReplayViewer,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './playing-view.html',
  styleUrl: './playing-view.scss',
})
export class PlayingView {
  private readonly translator = inject(Translator);
  private readonly tabElements =
    viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  public readonly match = input.required<PlayingMatchDto>();
  public readonly changed = output<MatchDto>();
  public readonly refreshNeeded = output();

  protected readonly tabs = MATCH_TABS;
  protected readonly tabLabels = TAB_LABELS;
  protected readonly roster = computed(
    (): Roster => rosterOf(this.match(), this.translator),
  );
  private readonly phase = computed((): DayPhase => dayPhaseOf(this.match()));
  /** Follows the day's phase (the match ending), not every refresh. */
  protected readonly selectedTab = linkedSignal<MatchTab>(
    (): MatchTab => OPENING_TAB[this.phase()],
  );
  protected readonly selectedZoneId = signal<ZoneId | null>(null);
  protected readonly planFromZoneId = signal<ZoneId | null>(null);

  protected selectTab(tab: MatchTab): void {
    this.selectedTab.set(tab);
  }

  protected onTabKey(event: KeyboardEvent): void {
    const next = tabAfterKey(this.selectedTab(), event.key);
    if (next !== null) {
      event.preventDefault();
      this.selectTab(next);
      this.tabElementOf(next).focus();
    }
  }

  protected planMoveFrom(zoneId: ZoneId): void {
    this.planFromZoneId.set(zoneId);
    this.selectTab('orders');
  }

  private tabElementOf(tab: MatchTab): HTMLButtonElement {
    return requirePresent(
      this.tabElements()[MATCH_TABS.indexOf(tab)],
      `the ${tab} tab`,
    ).nativeElement;
  }
}
