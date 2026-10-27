import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  viewChildren,
} from '@angular/core';
import type { ZoneView } from '@lunch-campaign/contracts';
import type { ZoneConnection, ZoneId } from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { Translator } from '../../core/i18n/translator';
import { armyCount } from '../../shared/army-text';
import type { Roster } from '../../shared/roster';
import type { PlacedZone } from './map-layout';
import {
  MAP_DIRECTIONS,
  placeZones,
  roadsBetween,
  viewBoxOf,
  ZONE_RADIUS,
  zoneInDirection,
} from './map-layout';
import { zoneLabel } from './zone-text';
import type { Road } from './map-layout';

/** Shown for an army hidden by fog. */
const UNKNOWN_COUNT = '?';
const DIAMETER_PER_RADIUS = 2;
/** Capitals are drawn as squares the size of the zone circle. */
const CAPITAL_SIDE = ZONE_RADIUS * DIAMETER_PER_RADIUS;
/** Gaps, in SVG user units, from the zone's edge to the city ring, the replay ring and the seat badge. */
const CITY_RING_GAP = 5;
const HIGHLIGHT_GAP = 11;
const SEAT_BADGE_INSET = 6;
const CITY_RING_RADIUS = ZONE_RADIUS + CITY_RING_GAP;
const HIGHLIGHT_RADIUS = ZONE_RADIUS + HIGHLIGHT_GAP;
const SEAT_BADGE_OFFSET = ZONE_RADIUS - SEAT_BADGE_INSET;
/** Text baselines from the zone centre: the name above, the army count below. */
const NAME_OFFSET_Y = -6;
const ARMY_OFFSET_Y = 16;
const SELECT_KEYS: ReadonlySet<string> = new Set(['Enter', ' ']);

/**
 * The campaign map as SVG. One tab stop: arrow keys move between zones, Enter or Space selects one.
 * Every zone is a labelled button, and the zone list shows the same information as a table.
 */
@Component({
  selector: 'lc-campaign-map',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign-map.html',
  styleUrl: './campaign-map.scss',
})
export class CampaignMap {
  private readonly translator = inject(Translator);
  private readonly zoneElements =
    viewChildren<ElementRef<SVGGElement>>('zoneElement');

  public readonly zones = input.required<readonly ZoneView[]>();
  public readonly connections = input.required<readonly ZoneConnection[]>();
  public readonly roster = input.required<Roster>();
  public readonly highlightedZoneIds = input<readonly ZoneId[]>([]);
  public readonly selectedZoneId = model<ZoneId | null>(null);

  protected readonly capitalSide = CAPITAL_SIDE;
  protected readonly zoneRadius = ZONE_RADIUS;
  protected readonly cityRingRadius = CITY_RING_RADIUS;
  protected readonly highlightRadius = HIGHLIGHT_RADIUS;
  protected readonly nameOffsetY = NAME_OFFSET_Y;
  protected readonly armyOffsetY = ARMY_OFFSET_Y;
  protected readonly seatBadgeOffset = SEAT_BADGE_OFFSET;

  protected readonly placed = computed((): readonly PlacedZone[] =>
    placeZones(this.zones()),
  );
  protected readonly roads = computed((): readonly Road[] =>
    roadsBetween(this.placed(), this.connections()),
  );
  protected readonly viewBox = computed((): string => viewBoxOf(this.placed()));
  /** The zone holding the map's single tab stop: the selected one, else the first. */
  protected readonly focusZoneId = linkedSignal<ZoneId>(
    (): ZoneId =>
      this.selectedZoneId() ??
      requirePresent(this.zones()[0], 'a zone on the map').zoneId,
  );

  protected label(zone: ZoneView): string {
    return zoneLabel(zone, this.roster(), this.translator);
  }

  protected armyShort(zone: ZoneView): string {
    return String(armyCount(zone.army) ?? UNKNOWN_COUNT);
  }

  protected isHighlighted(placed: PlacedZone): boolean {
    return this.highlightedZoneIds().includes(placed.zone.zoneId);
  }

  protected select(zoneId: ZoneId): void {
    this.selectedZoneId.set(zoneId);
    this.focusZoneId.set(zoneId);
  }

  protected onKey(event: KeyboardEvent, zone: ZoneView): void {
    const step = MAP_DIRECTIONS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      this.moveFocus(zoneInDirection(this.zones(), zone, step));
    }
    this.selectOnKey(event, zone.zoneId);
  }

  private selectOnKey(event: KeyboardEvent, zoneId: ZoneId): void {
    if (SELECT_KEYS.has(event.key)) {
      event.preventDefault();
      this.select(zoneId);
    }
  }

  private moveFocus(next: ZoneView | null): void {
    if (next !== null) {
      this.focusZoneId.set(next.zoneId);
      this.elementOf(next.zoneId).focus();
    }
  }

  private elementOf(zoneId: ZoneId): SVGGElement {
    return requirePresent(
      this.zoneElements().find(
        (element): boolean =>
          element.nativeElement.dataset['zoneId'] === zoneId,
      ),
      `the map element of zone ${zoneId}`,
    ).nativeElement;
  }
}
