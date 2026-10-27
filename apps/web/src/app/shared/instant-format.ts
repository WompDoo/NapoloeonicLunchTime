import { inject, Injectable } from '@angular/core';
import { LOCALE } from '../core/i18n/translator';

/**
 * Deadlines in the match's time zone, the one the whole table plays by, with the zone named. Only the time:
 * the open day's deadline is always on its own date, and the game day's name (Monday) is not the
 * calendar's (a match can start on a Wednesday).
 */
@Injectable({ providedIn: 'root' })
export class InstantFormat {
  private readonly locale = inject(LOCALE);

  public timeOfDay(isoInstant: string, timeZone: string): string {
    return new Intl.DateTimeFormat(this.locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).format(new Date(isoInstant));
  }
}
