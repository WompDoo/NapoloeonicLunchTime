import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlayerView } from '@lunch-campaign/contracts';
import type { RecruitOrder, UnitType } from '@lunch-campaign/engine';
import { UNIT_TYPES } from '@lunch-campaign/engine';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { clampCount } from '../../shared/own-army';

/** The most units one recruit order can ask for: more than any supply allows, so it never limits play. */
const MAX_RECRUITS_PER_ORDER = 99;
const DEFAULT_RECRUITS = 1;

/** New units, raised tonight at your starting capital. */
@Component({
  selector: 'lc-recruit-form',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="grid gap-4" (ngSubmit)="submit()">
      <p class="form__hint">{{ 'orders.recruitWhere' | t }}</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="grid gap-1">
          <label class="lc-label" for="recruit-type">{{
            'orders.unitType' | t
          }}</label>
          <select
            id="recruit-type"
            name="unitType"
            class="lc-input"
            [(ngModel)]="unitType"
          >
            @for (type of unitTypes; track type) {
              <option [ngValue]="type">
                {{ unitNameKey(type) | t }} ·
                {{
                  'common.supply'
                    | t: { count: view().orderRules.recruitCost[type] }
                }}
              </option>
            }
          </select>
        </div>
        <div class="grid gap-1">
          <label class="lc-label" for="recruit-count">{{
            'orders.count' | t
          }}</label>
          <input
            #field
            id="recruit-count"
            type="number"
            inputmode="numeric"
            class="lc-input"
            min="1"
            [max]="maxRecruits"
            [value]="count()"
            (input)="count.set(clamp(field.valueAsNumber))"
          />
        </div>
      </div>
      <p class="form__cost">{{ 'orders.cost' | t: { count: cost() } }}</p>
      <div>
        <button type="submit" class="lc-button" [disabled]="count() === 0">
          {{ 'orders.addToList' | t }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .form__hint,
    .form__cost {
      margin: 0;
      color: var(--muted);
      font-size: 0.875rem;
    }
  `,
})
export class RecruitForm {
  public readonly view = input.required<PlayerView>();
  public readonly add = output<RecruitOrder>();

  protected readonly unitTypes = UNIT_TYPES;
  protected readonly maxRecruits = MAX_RECRUITS_PER_ORDER;
  protected readonly unitType = signal<UnitType>('line');
  protected readonly count = signal(DEFAULT_RECRUITS);
  protected readonly cost = computed(
    (): number =>
      this.count() * this.view().orderRules.recruitCost[this.unitType()],
  );

  protected unitNameKey(unitType: UnitType): TranslationKey {
    return `unitName.${unitType}`;
  }

  protected clamp(value: number): number {
    return clampCount(value, MAX_RECRUITS_PER_ORDER);
  }

  protected submit(): void {
    this.add.emit({
      kind: 'recruit',
      unitType: this.unitType(),
      count: this.count(),
    });
  }
}
