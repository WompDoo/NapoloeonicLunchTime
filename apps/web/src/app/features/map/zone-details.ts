import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import type {
  PlayingMatchDto,
  SpyReport,
  ZoneView,
} from '@lunch-campaign/contracts';
import type { ZoneId } from '@lunch-campaign/engine';
import { hasAnyUnits } from '@lunch-campaign/engine';
import { createAction } from '../../core/api/action';
import { InlineErrors } from '../../core/api/inline-errors';
import { LunchApi } from '../../core/api/lunch-api';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { Translator } from '../../core/i18n/translator';
import { armyText, unitsText } from '../../shared/army-text';
import { ownUnitsIn } from '../../shared/own-army';
import { errorKeyOf } from '../../shared/error-key';
import type { Roster } from '../../shared/roster';
import type { SpyAvailability } from './spy-availability';
import { spyAvailabilityOf } from './spy-availability';
import type { Observable } from 'rxjs';

/** Why there is no spy button, by reason; `null` where the button shows or nothing needs saying. */
const SPY_NOTES: Readonly<Record<SpyAvailability, TranslationKey | null>> = {
  ownZone: null,
  reported: 'zone.spyReported',
  dayClosed: 'zone.spyClosed',
  unavailable: 'day.noSpies',
  tooExpensive: 'zone.spyTooExpensive',
  available: null,
};

/** What you know about the selected zone, and what you can do there: spy on it or plan a move from it. */
@Component({
  selector: 'lc-zone-details',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-details.html',
  styleUrl: './zone-details.scss',
})
export class ZoneDetails {
  private readonly api = inject(LunchApi);
  private readonly translator = inject(Translator);
  protected readonly spyError = inject(InlineErrors).for('spy');
  protected readonly errorKeyOf = errorKeyOf;

  public readonly zone = input.required<ZoneView>();
  public readonly match = input.required<PlayingMatchDto>();
  public readonly roster = input.required<Roster>();
  public readonly spied = output<SpyReport>();
  public readonly planMove = output<ZoneId>();

  protected readonly spyAvailability = computed(
    (): SpyAvailability =>
      spyAvailabilityOf({
        view: this.match().view,
        openDay: this.match().openDay,
        zone: this.zone(),
      }),
  );
  protected readonly spyNote = computed(
    (): TranslationKey | null => SPY_NOTES[this.spyAvailability()],
  );
  protected readonly report = computed(
    (): SpyReport | null =>
      this.match().view.spyReports.find(
        (report): boolean => report.zoneId === this.zone().zoneId,
      ) ?? null,
  );
  protected readonly canPlanMove = computed(
    (): boolean =>
      this.zone().ownerId === this.match().view.viewerId &&
      this.match().openDay !== null,
  );
  protected readonly hasUnits = computed((): boolean =>
    hasAnyUnits(ownUnitsIn(this.zone())),
  );
  protected readonly army = computed((): string =>
    armyText(this.zone().army, this.translator),
  );
  protected readonly kindKey = computed(
    (): TranslationKey => `map.kind.${this.zone().kind}`,
  );

  protected readonly spy = createAction(
    (zoneId: ZoneId): Observable<SpyReport> =>
      this.api.spy(this.match().matchId, { zoneId }),
  );

  protected reportUnits(report: SpyReport): string {
    return unitsText(report.units, this.translator);
  }

  protected async sendSpy(): Promise<void> {
    const report = await this.spy.run(this.zone().zoneId);
    this.announce(report);
  }

  private announce(report: SpyReport | null): void {
    if (report !== null) {
      this.spied.emit(report);
    }
  }
}
