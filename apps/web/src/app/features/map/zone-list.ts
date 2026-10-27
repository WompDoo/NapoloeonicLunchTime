import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
} from '@angular/core';
import type { ZoneView } from '@lunch-campaign/contracts';
import type { ZoneId } from '@lunch-campaign/engine';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { Translator } from '../../core/i18n/translator';
import { armyText } from '../../shared/army-text';
import type { Roster } from '../../shared/roster';

/** The map as a table: the same zones, owners and armies, for screen readers and small screens. */
@Component({
  selector: 'lc-zone-list',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="zones">
        <caption class="lc-visually-hidden">
          {{
            'map.listCaption' | t
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ 'map.column.zone' | t }}</th>
            <th scope="col">{{ 'map.column.kind' | t }}</th>
            <th scope="col">{{ 'map.column.owner' | t }}</th>
            <th scope="col">{{ 'map.column.army' | t }}</th>
          </tr>
        </thead>
        <tbody>
          @for (zone of zones(); track zone.zoneId) {
            <tr [class.zones__row--selected]="zone.zoneId === selectedZoneId()">
              <th scope="row">
                <button
                  type="button"
                  class="zones__select"
                  [attr.aria-pressed]="zone.zoneId === selectedZoneId()"
                  (click)="selectedZoneId.set(zone.zoneId)"
                >
                  {{ zone.zoneId }}
                </button>
              </th>
              <td>{{ kindKey(zone) | t }}</td>
              <td>{{ roster().ownerOf(zone.ownerId) }}</td>
              <td>{{ army(zone) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .zones {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9375rem;
    }
    .zones th,
    .zones td {
      padding: 0.5rem 0.625rem;
      border-bottom: 1px solid var(--line);
      text-align: left;
    }
    .zones thead th {
      color: var(--muted);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .zones__row--selected {
      background: var(--panel-sunk);
    }
    .zones__select {
      min-width: 2.75rem;
      min-height: 2.75rem;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .zones__select[aria-pressed='true'] {
      border-color: var(--accent);
      box-shadow: inset 0 0 0 2px var(--accent);
    }
    .zones__select:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
    }
  `,
})
export class ZoneList {
  private readonly translator = inject(Translator);

  public readonly zones = input.required<readonly ZoneView[]>();
  public readonly roster = input.required<Roster>();
  public readonly selectedZoneId = model<ZoneId | null>(null);

  protected kindKey(zone: ZoneView): TranslationKey {
    return `map.kind.${zone.kind}`;
  }

  protected army(zone: ZoneView): string {
    return armyText(zone.army, this.translator);
  }
}
