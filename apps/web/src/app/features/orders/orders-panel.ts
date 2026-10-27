import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MatchDto, PlayingMatchDto } from '@lunch-campaign/contracts';
import type {
  Order,
  OrderRejectionReason,
  ZoneId,
} from '@lunch-campaign/engine';
import { createAction } from '../../core/api/action';
import { InlineErrors } from '../../core/api/inline-errors';
import { LunchApi } from '../../core/api/lunch-api';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { Translator } from '../../core/i18n/translator';
import { errorKeyOf } from '../../shared/error-key';
import type { Roster } from '../../shared/roster';
import { StatePanel } from '../../shared/state-panel';
import { AbilityForm } from './ability-form';
import { describeOrder } from './describe-order';
import { MoveForm } from './move-form';
import {
  movesUsed,
  problemsAt,
  supplyCommitted,
  withoutOrderAt,
} from './order-drafts';
import { RecruitForm } from './recruit-form';
import { SupportForm } from './support-form';
import { UpgradeForm } from './upgrade-form';
import type { Observable } from 'rxjs';

/** "Not saved yet" while you edit; "Saved" once the API holds orders of yours; nothing before either. */
export function saveStatusOf(
  unsaved: boolean,
  savedCount: number,
): TranslationKey | null {
  return unsaved ? 'orders.unsaved' : savedStatusOf(savedCount);
}

function savedStatusOf(savedCount: number): TranslationKey | null {
  return savedCount === 0 ? null : 'orders.saved';
}

export const ORDER_KINDS = [
  'move',
  'recruit',
  'support',
  'buyUpgrade',
  'useAbility',
] as const satisfies readonly Order['kind'][];

const KIND_LABELS: Readonly<Record<Order['kind'], TranslationKey>> = {
  move: 'orders.kind.move',
  recruit: 'orders.kind.recruit',
  support: 'orders.kind.support',
  buyUpgrade: 'orders.kind.buyUpgrade',
  useAbility: 'orders.kind.useAbility',
};

/**
 * Today's orders: a draft you build here and save as a whole. Until you change something, the draft is
 * what the API holds, so refreshes keep it current; once you change it, your edits stay until saved.
 */
@Component({
  selector: 'lc-orders-panel',
  imports: [
    AbilityForm,
    FormsModule,
    MoveForm,
    RecruitForm,
    StatePanel,
    SupportForm,
    TranslatePipe,
    UpgradeForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-panel.html',
  styleUrl: './orders-panel.scss',
})
export class OrdersPanel {
  private readonly api = inject(LunchApi);
  private readonly inlineErrors = inject(InlineErrors);
  private readonly translator = inject(Translator);
  protected readonly ordersError = this.inlineErrors.for('orders');
  protected readonly errorKeyOf = errorKeyOf;

  public readonly match = input.required<PlayingMatchDto>();
  public readonly roster = input.required<Roster>();
  /** A zone the map asked to plan a move from. */
  public readonly planFromZoneId = model<ZoneId | null>(null);
  public readonly changed = output<MatchDto>();

  protected readonly kinds = ORDER_KINDS;
  protected readonly kindLabels = KIND_LABELS;
  protected readonly kind = signal<Order['kind']>('move');
  private readonly edits = signal<readonly Order[] | null>(null);
  protected readonly draft = computed(
    (): readonly Order[] => this.edits() ?? this.match().yourOrders,
  );
  protected readonly unsaved = computed((): boolean => this.edits() !== null);
  protected readonly saveStatus = computed((): TranslationKey | null =>
    saveStatusOf(this.unsaved(), this.match().yourOrders.length),
  );
  protected readonly isOpen = computed(
    (): boolean => this.match().openDay !== null,
  );
  protected readonly movesUsed = computed((): number =>
    movesUsed(this.draft()),
  );
  protected readonly supplyLeft = computed(
    (): number =>
      this.match().view.me.supply -
      supplyCommitted(this.draft(), this.match().view.orderRules),
  );

  protected readonly save = createAction(
    (orders: readonly Order[]): Observable<MatchDto> =>
      this.api.submitOrders(this.match().matchId, { orders }),
  );

  protected describe(order: Order): string {
    return describeOrder(order, {
      translator: this.translator,
      commanderId: this.match().view.me.commanderId,
    });
  }

  protected problemKeys(orderIndex: number): readonly TranslationKey[] {
    return problemsAt(this.ordersError(), orderIndex).map(
      (reason: OrderRejectionReason): TranslationKey =>
        `orders.problem.${reason}`,
    );
  }

  protected addOrder(order: Order): void {
    this.edit([...this.draft(), order]);
  }

  protected removeOrder(orderIndex: number): void {
    this.edit(withoutOrderAt(this.draft(), orderIndex));
  }

  protected async submit(): Promise<void> {
    const saved = await this.save.run(this.draft());
    this.showSaved(saved);
  }

  /** The last refusal's positions no longer match an edited list, so it goes when the list changes. */
  private edit(orders: readonly Order[]): void {
    this.inlineErrors.clear('orders');
    this.edits.set(orders);
  }

  private showSaved(saved: MatchDto | null): void {
    if (saved !== null) {
      this.edits.set(null);
      this.changed.emit(saved);
    }
  }
}
