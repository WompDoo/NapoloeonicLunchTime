import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import type { SpyReport } from '@lunch-campaign/contracts';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { Translator } from '../../core/i18n/translator';
import { unitsText } from '../../shared/army-text';
import type { Roster } from '../../shared/roster';

/** Today's spy reports. They stay true all day: the world only changes at night. */
@Component({
  selector: 'lc-spy-reports',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="lc-panel" aria-labelledby="spies-title">
      <div class="grid gap-3 p-4">
        <h2 id="spies-title" class="reports__title">{{ 'spies.title' | t }}</h2>
        @if (reports().length === 0) {
          <p class="reports__empty">{{ 'spies.empty' | t }}</p>
        } @else {
          <ul class="grid gap-2">
            @for (report of reports(); track report.zoneId) {
              <li class="reports__item">
                {{
                  'spies.report'
                    | t
                      : {
                          zone: report.zoneId,
                          owner: roster().ownerOf(report.ownerId),
                          units: units(report),
                        }
                }}
                @if (report.unidentified > 0) {
                  ·
                  {{ 'spies.unidentified' | t: { count: report.unidentified } }}
                }
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: `
    .reports__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.125rem;
    }
    .reports__empty {
      margin: 0;
      color: var(--muted);
    }
    .reports__item {
      font-size: 0.9375rem;
    }
  `,
})
export class SpyReports {
  private readonly translator = inject(Translator);

  public readonly reports = input.required<readonly SpyReport[]>();
  public readonly roster = input.required<Roster>();

  protected units(report: SpyReport): string {
    return unitsText(report.units, this.translator);
  }
}
