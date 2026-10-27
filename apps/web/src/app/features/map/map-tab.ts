import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { PlayingMatchDto } from '@lunch-campaign/contracts';
import type { ZoneId } from '@lunch-campaign/engine';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { Roster } from '../../shared/roster';
import { StatePanel } from '../../shared/state-panel';
import { CampaignMap } from './campaign-map';
import { SpyReports } from './spy-reports';
import { ZoneDetails } from './zone-details';
import { ZoneList } from './zone-list';
import type { ZoneView } from '@lunch-campaign/contracts';

/** The map or the zone list, the selected zone, and today's spy reports. */
@Component({
  selector: 'lc-map-tab',
  imports: [
    CampaignMap,
    SpyReports,
    StatePanel,
    TranslatePipe,
    ZoneDetails,
    ZoneList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section class="lc-panel" aria-labelledby="map-title">
        <div class="grid gap-3 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 id="map-title" class="tab__title">{{ 'map.title' | t }}</h2>
            <button
              type="button"
              class="lc-button lc-button--quiet"
              [attr.aria-pressed]="showList()"
              (click)="toggleList()"
            >
              {{ 'map.listToggle' | t }}
            </button>
          </div>
          @if (showList()) {
            <lc-zone-list
              [zones]="match().view.zones"
              [roster]="roster()"
              [(selectedZoneId)]="selectedZoneId"
            />
          } @else {
            <lc-campaign-map
              [zones]="match().view.zones"
              [connections]="match().view.connections"
              [roster]="roster()"
              [(selectedZoneId)]="selectedZoneId"
            />
          }
        </div>
      </section>
      <div class="grid content-start gap-4">
        @if (selectedZone(); as zone) {
          <lc-zone-details
            [zone]="zone"
            [match]="match()"
            [roster]="roster()"
            (spied)="refreshNeeded.emit()"
            (planMove)="planMove.emit($event)"
          />
        } @else {
          <lc-state-panel state="empty" message="zone.none" />
        }
        <lc-spy-reports
          [reports]="match().view.spyReports"
          [roster]="roster()"
        />
      </div>
    </div>
  `,
  styles: `
    .tab__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.125rem;
    }
  `,
})
export class MapTab {
  public readonly match = input.required<PlayingMatchDto>();
  public readonly roster = input.required<Roster>();
  public readonly selectedZoneId = model<ZoneId | null>(null);
  public readonly planMove = output<ZoneId>();
  public readonly refreshNeeded = output();

  protected readonly showList = signal(false);
  protected readonly selectedZone = computed(
    (): ZoneView | null =>
      this.match().view.zones.find(
        (zone): boolean => zone.zoneId === this.selectedZoneId(),
      ) ?? null,
  );

  protected toggleList(): void {
    this.showList.update((showList): boolean => !showList);
  }
}
