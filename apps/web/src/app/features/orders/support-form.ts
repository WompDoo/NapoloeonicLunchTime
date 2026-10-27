import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlayerView } from '@lunch-campaign/contracts';
import type { SupportOrder, ZoneId } from '@lunch-campaign/engine';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { adjacentZoneIds } from '../../shared/map-geometry';
import { clampCount, ownUnitsAt, ownZonesWith } from '../../shared/own-army';
import { StatePanel } from '../../shared/state-panel';
import type { ZoneView } from '@lunch-campaign/contracts';

/** Artillery that holds and bombards a battle of yours next door. */
@Component({
  selector: 'lc-support-form',
  imports: [FormsModule, StatePanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (gunZones().length === 0) {
      <lc-state-panel state="empty" message="orders.noArtillery" />
    } @else {
      <form class="grid gap-4" (ngSubmit)="submit()">
        <p class="form__hint">{{ 'orders.supportHint' | t }}</p>
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="grid gap-1">
            <label class="lc-label" for="support-from">{{
              'orders.from' | t
            }}</label>
            <select
              id="support-from"
              name="from"
              class="lc-input"
              [(ngModel)]="fromZoneId"
            >
              <option [ngValue]="null">{{ 'orders.choose' | t }}</option>
              @for (zone of gunZones(); track zone.zoneId) {
                <option [ngValue]="zone.zoneId">{{ zone.zoneId }}</option>
              }
            </select>
          </div>
          <div class="grid gap-1">
            <label class="lc-label" for="support-target">{{
              'orders.target' | t
            }}</label>
            <select
              id="support-target"
              name="target"
              class="lc-input"
              [(ngModel)]="targetZoneId"
            >
              <option [ngValue]="null">{{ 'orders.choose' | t }}</option>
              @for (zoneId of targets(); track zoneId) {
                <option [ngValue]="zoneId">{{ zoneId }}</option>
              }
            </select>
          </div>
          <div class="grid gap-1">
            <label class="lc-label" for="support-count">{{
              'orders.count' | t
            }}</label>
            <input
              #field
              id="support-count"
              type="number"
              inputmode="numeric"
              class="lc-input"
              min="1"
              [max]="guns()"
              [value]="count()"
              (input)="count.set(clamp(field.valueAsNumber))"
            />
          </div>
        </div>
        <div>
          <button type="submit" class="lc-button" [disabled]="order() === null">
            {{ 'orders.addToList' | t }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .form__hint {
      margin: 0;
      color: var(--muted);
      font-size: 0.875rem;
    }
  `,
})
export class SupportForm {
  public readonly view = input.required<PlayerView>();
  public readonly add = output<SupportOrder>();

  protected readonly gunZones = computed((): readonly ZoneView[] =>
    ownZonesWith(this.view(), ['artillery']),
  );
  protected readonly fromZoneId = signal<ZoneId | null>(null);
  protected readonly targets = computed((): readonly ZoneId[] =>
    adjacentToZone(this.view(), this.fromZoneId()),
  );
  protected readonly targetZoneId = linkedSignal<
    readonly ZoneId[],
    ZoneId | null
  >({
    source: this.targets,
    computation: (): ZoneId | null => null,
  });
  protected readonly guns = computed(
    (): number => ownUnitsAt(this.view(), this.fromZoneId()).artillery,
  );
  protected readonly count = linkedSignal((): number => this.guns());
  protected readonly order = computed((): SupportOrder | null =>
    supportOrderOf(this.fromZoneId(), this.targetZoneId(), this.count()),
  );

  protected clamp(value: number): number {
    return clampCount(value, this.guns());
  }

  protected submit(): void {
    const order = this.order();
    if (order !== null) {
      this.add.emit(order);
    }
  }
}

function adjacentToZone(
  view: PlayerView,
  zoneId: ZoneId | null,
): readonly ZoneId[] {
  return zoneId === null ? [] : adjacentZoneIds(view.connections, zoneId);
}

function supportOrderOf(
  fromZoneId: ZoneId | null,
  targetZoneId: ZoneId | null,
  count: number,
): SupportOrder | null {
  return fromZoneId === null
    ? null
    : supportTo(fromZoneId, targetZoneId, count);
}

function supportTo(
  fromZoneId: ZoneId,
  targetZoneId: ZoneId | null,
  count: number,
): SupportOrder | null {
  return targetZoneId === null
    ? null
    : withGuns({ kind: 'support', fromZoneId, targetZoneId, count });
}

function withGuns(order: SupportOrder): SupportOrder | null {
  return order.count > 0 ? order : null;
}
