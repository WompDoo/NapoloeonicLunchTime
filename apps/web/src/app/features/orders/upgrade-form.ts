import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlayerView } from '@lunch-campaign/contracts';
import type { BuyUpgradeOrder, Order } from '@lunch-campaign/engine';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { upgradeDescription, upgradeName } from '../../shared/content-keys';
import { StatePanel } from '../../shared/state-panel';

/** Upgrades you neither own nor have in today's orders. */
export function upgradesOnOffer(
  view: PlayerView,
  draft: readonly Order[],
): readonly string[] {
  const planned = draft.flatMap((order): string[] =>
    order.kind === 'buyUpgrade' ? [order.upgradeId] : [],
  );
  return view.orderRules.upgradeIds.filter(
    (upgradeId): boolean =>
      !view.me.upgrades.includes(upgradeId) && !planned.includes(upgradeId),
  );
}

/** A permanent upgrade, bought tonight. */
@Component({
  selector: 'lc-upgrade-form',
  imports: [FormsModule, StatePanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (offered().length === 0) {
      <lc-state-panel state="empty" message="orders.noUpgrades" />
    } @else {
      <form class="grid gap-4" (ngSubmit)="submit()">
        <fieldset class="grid gap-2">
          <legend class="lc-label">
            {{ 'orders.upgrade' | t }} ·
            {{ 'common.supply' | t: { count: view().orderRules.upgradeCost } }}
          </legend>
          @for (upgradeId of offered(); track upgradeId) {
            <label class="upgrade">
              <span class="flex items-start gap-2">
                <input
                  type="radio"
                  name="upgrade"
                  [value]="upgradeId"
                  [checked]="upgradeId === chosenUpgradeId()"
                  (change)="chosenUpgradeId.set(upgradeId)"
                />
                <span class="grid gap-1">
                  <span class="upgrade__name">{{
                    upgradeName(upgradeId) | t
                  }}</span>
                  <span class="upgrade__text">{{
                    upgradeDescription(upgradeId) | t
                  }}</span>
                </span>
              </span>
            </label>
          }
        </fieldset>
        <div>
          <button
            type="submit"
            class="lc-button"
            [disabled]="chosenUpgradeId() === null"
          >
            {{ 'orders.addToList' | t }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .upgrade {
      display: block;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .upgrade:focus-within {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
    }
    .upgrade__name {
      font-weight: 600;
    }
    .upgrade__text {
      color: var(--muted);
      font-size: 0.875rem;
    }
  `,
})
export class UpgradeForm {
  public readonly view = input.required<PlayerView>();
  public readonly draft = input.required<readonly Order[]>();
  public readonly add = output<BuyUpgradeOrder>();

  protected readonly upgradeName = upgradeName;
  protected readonly upgradeDescription = upgradeDescription;
  protected readonly offered = computed((): readonly string[] =>
    upgradesOnOffer(this.view(), this.draft()),
  );
  protected readonly chosenUpgradeId = linkedSignal<
    readonly string[],
    string | null
  >({
    source: this.offered,
    computation: (): string | null => null,
  });

  protected submit(): void {
    const upgradeId = this.chosenUpgradeId();
    if (upgradeId !== null) {
      this.add.emit({ kind: 'buyUpgrade', upgradeId });
    }
  }
}
