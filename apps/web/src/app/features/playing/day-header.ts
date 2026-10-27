import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import type { PlayingMatchDto } from '@lunch-campaign/contracts';
import {
  TranslateMessagePipe,
  TranslatePipe,
} from '../../core/i18n/translate-pipe';
import { eventDescription, eventName } from '../../shared/content-keys';
import { InstantFormat } from '../../shared/instant-format';
import { dayStatusOf } from './day-status';
import type { Translatable } from '../../core/i18n/translator';

/** Today at a glance: the day, its deadline, your supply, the event in play and what a spy costs. */
@Component({
  selector: 'lc-day-header',
  imports: [TranslatePipe, TranslateMessagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="lc-panel">
      <div class="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <div class="grid gap-1">
          @if (match().view.dayLabel; as dayLabel) {
            <h1 class="day__title">
              {{
                'day.title'
                  | t: { number: match().view.turnNumber, label: dayLabel }
              }}
            </h1>
          }
          <p class="day__status" role="status">{{ status() | tm }}</p>
        </div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-1">
          <div>
            <dt class="lc-label">{{ 'day.supply' | t }}</dt>
            <dd class="day__value">
              {{ 'common.supply' | t: { count: match().view.me.supply } }}
            </dd>
          </div>
          <div>
            <dt class="lc-label">{{ 'day.spies' | t }}</dt>
            <dd class="day__value">
              {{
                match().view.spiesAvailable
                  ? ('day.spyCost' | t: { cost: match().view.spyCost })
                  : ('day.noSpies' | t)
              }}
            </dd>
          </div>
        </dl>
      </div>
      <div class="day__events">
        <div class="flex flex-wrap gap-2 px-4 py-3">
          <span class="lc-label">{{ 'day.event' | t }}</span>
          @for (eventId of match().view.activeEventIds; track eventId) {
            <span class="day__event">
              <strong>{{ eventName(eventId) | t }}</strong
              >: {{ eventDescription(eventId) | t }}
            </span>
          } @empty {
            <span class="day__event">{{ 'day.noEvent' | t }}</span>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .day__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.5rem;
    }
    .day__status {
      margin: 0;
      color: var(--muted);
    }
    .day__value {
      margin: 0;
      font-weight: 600;
    }
    .day__events {
      border-top: 1px solid var(--line);
    }
    .day__event {
      font-size: 0.875rem;
    }
  `,
})
export class DayHeader {
  private readonly format = inject(InstantFormat);
  protected readonly eventName = eventName;
  protected readonly eventDescription = eventDescription;

  public readonly match = input.required<PlayingMatchDto>();
  protected readonly status = computed(
    (): Translatable =>
      dayStatusOf(this.match(), (isoInstant): string =>
        this.format.timeOfDay(isoInstant, this.match().timeZone),
      ),
  );
}
